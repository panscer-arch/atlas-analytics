import sys


def main():
    path = sys.argv[1]
    with open(path, encoding="utf-8") as source:
        text = source.read()

    if "location /api/finance/" in text:
        return

    snippet = """

    location /api/finance/ {
        proxy_pass http://127.0.0.1:8787/api/finance/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10m;
    }
"""
    for location in ("location /api/marketing/", "location /api/content/", "location /"):
        index = text.find(location)
        if index != -1:
            line_start = text.rfind("\n", 0, index) + 1
            text = text[:line_start] + snippet + "\n" + text[line_start:]
            break
    else:
        index = text.rfind("}")
        text = text[:index] + snippet + "\n" + text[index:]

    with open(path, "w", encoding="utf-8") as target:
        target.write(text)


if __name__ == "__main__":
    main()
