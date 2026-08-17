#!/bin/sh
set -eu

umask 077
mkdir -p /certs /backups /source-data
chown 999:999 /backups /source-data
chmod 0700 /backups /source-data

certificate_key_matches() {
  certificate_public_key="$(openssl x509 -in "$1" -pubkey -noout 2>/dev/null)" || return 1
  private_public_key="$(openssl pkey -in "$2" -pubout 2>/dev/null)" || return 1
  [ "$certificate_public_key" = "$private_public_key" ]
}

certificates_are_valid() {
  [ -s /certs/ca.crt ] \
    && [ -s /certs/source.crt ] \
    && [ -s /certs/source.key ] \
    && [ -s /certs/restore.crt ] \
    && [ -s /certs/restore.key ] \
    && openssl verify -CAfile /certs/ca.crt /certs/source.crt /certs/restore.crt >/dev/null 2>&1 \
    && openssl x509 -checkend 2592000 -noout -in /certs/ca.crt >/dev/null 2>&1 \
    && openssl x509 -checkend 2592000 -noout -in /certs/source.crt >/dev/null 2>&1 \
    && openssl x509 -checkend 2592000 -noout -in /certs/restore.crt >/dev/null 2>&1 \
    && openssl x509 -checkhost source -noout -in /certs/source.crt >/dev/null 2>&1 \
    && openssl x509 -checkhost restore -noout -in /certs/restore.crt >/dev/null 2>&1 \
    && certificate_key_matches /certs/source.crt /certs/source.key \
    && certificate_key_matches /certs/restore.crt /certs/restore.key
}

if certificates_are_valid; then
  exit 0
fi

work="/certs/.build.$$"
rm -rf "$work"
mkdir -p "$work"
trap 'rm -rf "$work"' EXIT HUP INT TERM

openssl req -x509 -newkey rsa:3072 -sha256 -nodes \
  -keyout "$work/ca.key" \
  -out "$work/ca.crt" \
  -days 825 \
  -subj "/CN=Atlas Finance Staging Database CA" >/dev/null 2>&1

issue_server_certificate() {
  name="$1"
  cat >"$work/$name.ext" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:$name
EOF
  openssl req -newkey rsa:3072 -sha256 -nodes \
    -keyout "$work/$name.key" \
    -out "$work/$name.csr" \
    -subj "/CN=$name" >/dev/null 2>&1
  openssl x509 -req -sha256 \
    -in "$work/$name.csr" \
    -CA "$work/ca.crt" \
    -CAkey "$work/ca.key" \
    -CAcreateserial \
    -out "$work/$name.crt" \
    -days 825 \
    -extfile "$work/$name.ext" >/dev/null 2>&1
}

issue_server_certificate source
issue_server_certificate restore
openssl verify -CAfile "$work/ca.crt" "$work/source.crt" "$work/restore.crt" >/dev/null
rm -f "$work/ca.key"

chmod 0644 "$work/ca.crt" "$work/source.crt" "$work/restore.crt"
chmod 0640 "$work/source.key" "$work/restore.key"
chown root:999 "$work/source.key" "$work/restore.key"

for file in ca.crt source.crt source.key restore.crt restore.key; do
  mv "$work/$file" "/certs/$file"
done

exit 0
