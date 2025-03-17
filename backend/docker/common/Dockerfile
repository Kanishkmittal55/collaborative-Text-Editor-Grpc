# Use Go 1.21 as the base image
FROM golang:1.23

# Quietly update apt and install unzip + curl
RUN apt-get -qq update && apt-get -qq install -y unzip curl

# Download and install protoc (v30.1)
WORKDIR /tmp
RUN curl -sSL "https://github.com/protocolbuffers/protobuf/releases/download/v30.1/protoc-30.1-linux-x86_64.zip" -o protoc.zip \
    && unzip -qq protoc.zip \
    && cp ./bin/protoc /usr/local/bin/protoc

# Create and switch to /go/src/app
WORKDIR /go/src/app

# Copy the entire collabTexteditorService folder (including *.proto)
COPY collabTexteditorService collabTexteditorService
# Copy go.mod and go.sum into /go/src/app
COPY go.mod go.sum ./

# Download Go module dependencies
RUN go mod download

# Install protoc-gen-go and protoc-gen-go-grpc, plus Delve
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest \
    && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest \
    && go install github.com/go-delve/delve/cmd/dlv@latest

# Generate the gRPC code from the proto file
WORKDIR /go/src/app/collabTexteditorService
RUN protoc \
    --go_out=. \
    --go_opt=paths=source_relative \
    --go-grpc_out=. \
    --go-grpc_opt=paths=source_relative \
    collabTexteditorService.proto
