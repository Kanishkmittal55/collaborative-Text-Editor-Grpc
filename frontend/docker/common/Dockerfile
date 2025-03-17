# install "protoc" and the plugin "protoc-gen-grpc-web"

FROM collabtexteditor/chromium

WORKDIR /tmp

RUN apk -U --no-cache add protobuf@edge

# Currently the project is using grpc-web v1.5.0 , please be careful while updating
RUN curl -sSL https://github.com/grpc/grpc-web/releases/download/1.5.0/protoc-gen-grpc-web-1.5.0-linux-x86_64 -o /usr/local/bin/protoc-gen-grpc-web && chmod +x /usr/local/bin/protoc-gen-grpc-web

WORKDIR /tmp

COPY /collabTexteditorService/*.proto .