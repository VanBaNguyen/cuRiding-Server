/*
 * qnx_client_example.c
 *
 * GPS client for Raspberry Pi 5 running QNX.
 * Reads NMEA sentences from a serial GPS device and POSTs them to the
 * cuRiding relay server. Can also send events (e.g. crash detection).
 *
 * Uses only POSIX sockets — no external libraries required.
 *
 * Build (QNX cross-compile or on-device):
 *   qcc -o gps_client qnx_client_example.c -lsocket
 *
 * Or with GCC if available:
 *   gcc -o gps_client qnx_client_example.c
 *
 * Usage:
 *   ./gps_client
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <termios.h>
#include <errno.h>
#include <time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <arpa/inet.h>

/* ---------------------------------------------------------------------------
 * Configuration — adjust for your deployment
 * ---------------------------------------------------------------------------*/
#define SERVER_HOST     "192.168.1.100"   /* your server IP */
#define SERVER_PORT     8000
#define DEVICE_ID       "pi-001"
#define SERIAL_PORT     "/dev/ser1"       /* GPS serial device on QNX */
#define SERIAL_BAUD     B9600
#define SEND_INTERVAL   1                 /* seconds between posts */
#define BUF_SIZE        1024
#define HTTP_BUF_SIZE   2048

/* ---------------------------------------------------------------------------
 * HTTP POST over raw TCP socket
 * ---------------------------------------------------------------------------*/
static int http_post(const char *host, int port, const char *path,
                     const char *json_body)
{
    int sockfd;
    struct sockaddr_in server_addr;
    struct hostent *server;
    char request[HTTP_BUF_SIZE];
    char response[HTTP_BUF_SIZE];
    int body_len = (int)strlen(json_body);
    int n;

    /* Resolve host */
    server = gethostbyname(host);
    if (!server) {
        fprintf(stderr, "[ERR] Cannot resolve host: %s\n", host);
        return -1;
    }

    /* Create socket */
    sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) {
        perror("[ERR] socket");
        return -1;
    }

    /* Set a 5-second send/recv timeout */
    struct timeval tv;
    tv.tv_sec = 5;
    tv.tv_usec = 0;
    setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    setsockopt(sockfd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));

    /* Connect */
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    memcpy(&server_addr.sin_addr.s_addr, server->h_addr, server->h_length);

    if (connect(sockfd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("[ERR] connect");
        close(sockfd);
        return -1;
    }

    /* Build HTTP request */
    snprintf(request, sizeof(request),
        "POST %s HTTP/1.1\r\n"
        "Host: %s:%d\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: %d\r\n"
        "Connection: close\r\n"
        "\r\n"
        "%s",
        path, host, port, body_len, json_body);

    /* Send */
    n = (int)send(sockfd, request, strlen(request), 0);
    if (n < 0) {
        perror("[ERR] send");
        close(sockfd);
        return -1;
    }

    /* Read response (just for status code) */
    memset(response, 0, sizeof(response));
    n = (int)recv(sockfd, response, sizeof(response) - 1, 0);
    if (n > 0) {
        /* Extract HTTP status code */
        int status = 0;
        sscanf(response, "HTTP/%*s %d", &status);
        printf("[%s] %d\n", (status >= 200 && status < 300) ? "OK" : "ERR", status);
    }

    close(sockfd);
    return 0;
}

/* ---------------------------------------------------------------------------
 * Send raw NMEA sentences to the server
 * ---------------------------------------------------------------------------*/
static void send_nmea(const char *nmea_lines)
{
    char json[HTTP_BUF_SIZE];

    /* Escape newlines in the NMEA string for JSON */
    char escaped[BUF_SIZE];
    int j = 0;
    for (int i = 0; nmea_lines[i] && j < (int)sizeof(escaped) - 2; i++) {
        if (nmea_lines[i] == '\n') {
            escaped[j++] = '\\';
            escaped[j++] = 'n';
        } else if (nmea_lines[i] == '\r') {
            /* skip carriage returns */
        } else {
            escaped[j++] = nmea_lines[i];
        }
    }
    escaped[j] = '\0';

    snprintf(json, sizeof(json),
        "{\"device_id\":\"%s\",\"nmea\":\"%s\"}",
        DEVICE_ID, escaped);

    http_post(SERVER_HOST, SERVER_PORT, "/api/v1/gps/nmea", json);
}

/* ---------------------------------------------------------------------------
 * Send an event (crash, low battery, etc.)
 * ---------------------------------------------------------------------------*/
static void send_event(const char *event_type, const char *message,
                       double lat, double lon)
{
    char json[HTTP_BUF_SIZE];
    time_t now = time(NULL);
    struct tm *t = gmtime(&now);
    char timestamp[32];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", t);

    snprintf(json, sizeof(json),
        "{\"device_id\":\"%s\","
        "\"event_type\":\"%s\","
        "\"message\":\"%s\","
        "\"latitude\":%.7f,"
        "\"longitude\":%.7f,"
        "\"timestamp\":\"%s\"}",
        DEVICE_ID, event_type, message, lat, lon, timestamp);

    http_post(SERVER_HOST, SERVER_PORT, "/api/v1/events", json);
}

/* ---------------------------------------------------------------------------
 * Open and configure the serial port for GPS
 * ---------------------------------------------------------------------------*/
static int open_serial(const char *port)
{
    int fd = open(port, O_RDONLY | O_NOCTTY);
    if (fd < 0) {
        fprintf(stderr, "[ERR] Cannot open %s: %s\n", port, strerror(errno));
        return -1;
    }

    struct termios tty;
    memset(&tty, 0, sizeof(tty));
    if (tcgetattr(fd, &tty) != 0) {
        perror("[ERR] tcgetattr");
        close(fd);
        return -1;
    }

    cfsetispeed(&tty, SERIAL_BAUD);
    cfsetospeed(&tty, SERIAL_BAUD);

    tty.c_cflag &= ~PARENB;        /* No parity */
    tty.c_cflag &= ~CSTOPB;        /* 1 stop bit */
    tty.c_cflag &= ~CSIZE;
    tty.c_cflag |= CS8;            /* 8 data bits */
    tty.c_cflag |= CREAD | CLOCAL; /* Enable receiver, ignore modem lines */

    tty.c_lflag &= ~(ICANON | ECHO | ECHOE | ISIG); /* Raw input */
    tty.c_iflag &= ~(IXON | IXOFF | IXANY);         /* No sw flow control */
    tty.c_oflag &= ~OPOST;                           /* Raw output */

    tty.c_cc[VMIN]  = 1;   /* Block until at least 1 byte */
    tty.c_cc[VTIME] = 10;  /* 1-second timeout (tenths of a second) */

    tcsetattr(fd, TCSANOW, &tty);
    return fd;
}

/* ---------------------------------------------------------------------------
 * Read one NMEA line from serial (up to \n)
 * ---------------------------------------------------------------------------*/
static int read_line(int fd, char *buf, int max_len)
{
    int i = 0;
    char c;
    while (i < max_len - 1) {
        int n = (int)read(fd, &c, 1);
        if (n <= 0) return -1;
        if (c == '\n') {
            buf[i] = '\0';
            return i;
        }
        if (c != '\r') {
            buf[i++] = c;
        }
    }
    buf[i] = '\0';
    return i;
}

/* ---------------------------------------------------------------------------
 * Main — read GPS serial, forward NMEA to server
 * ---------------------------------------------------------------------------*/
int main(void)
{
    printf("cuRiding GPS client — device '%s'\n", DEVICE_ID);
    printf("Server: %s:%d\n", SERVER_HOST, SERVER_PORT);
    printf("Serial: %s\n\n", SERIAL_PORT);

    int serial_fd = open_serial(SERIAL_PORT);
    if (serial_fd < 0) {
        /* If serial port isn't available, run in demo mode */
        printf("Serial port unavailable — running in demo mode\n\n");

        const char *sample =
            "$GNRMC,201530.00,A,4525.1234,N,07541.5678,W,12.4,83.2,110726,,,A*6F\n"
            "$GNGGA,201530.00,4525.1234,N,07541.5678,W,1,09,0.9,82.4,M,-34.0,M,,*5A";

        while (1) {
            send_nmea(sample);
            sleep(SEND_INTERVAL);
        }
    }

    /*
     * Read NMEA sentences from serial.
     * Buffer an RMC + GGA pair and send them together.
     */
    char nmea_buf[BUF_SIZE];
    char line[256];
    nmea_buf[0] = '\0';
    int has_rmc = 0;
    int has_gga = 0;

    while (1) {
        if (read_line(serial_fd, line, sizeof(line)) <= 0)
            continue;

        /* Accumulate into buffer */
        if (strlen(nmea_buf) + strlen(line) + 2 < sizeof(nmea_buf)) {
            if (nmea_buf[0] != '\0')
                strcat(nmea_buf, "\n");
            strcat(nmea_buf, line);
        }

        if (strstr(line, "RMC")) has_rmc = 1;
        if (strstr(line, "GGA")) has_gga = 1;

        /* Once we have both sentences, send and reset */
        if (has_rmc && has_gga) {
            send_nmea(nmea_buf);
            nmea_buf[0] = '\0';
            has_rmc = 0;
            has_gga = 0;
        }
    }

    close(serial_fd);
    return 0;

    /*
     * Example: sending a crash event
     * send_event("crash", "Impact detected — 4.2g", 45.4189, -75.6945);
     */
}
