# NGINX

## SelfSigned SSL certificates

`openssl req -x509 -nodes -days 365 -newkey rsa:2048   -keyout /etc/nginx/private/selfsigned.key   -out /etc/nginx/certs/selfsigned.crt   -subj "/CN=localhost"`

