# frontend client with dev-config
FROM collabtexteditor/go-server-common

WORKDIR /go/src/app/backend

COPY /backend/*.go .

RUN go build -gcflags "all=-N -l" -o main .

# port 40000 for delve
EXPOSE 9090 40000

# Need to Fix - High ROI 
# CMD ["/go/bin/dlv", "--listen=:40000", "--headless=true", "--api-version=2", "exec", "/go/src/app/backend/main"]

CMD ["/go/src/app/backend/main"]

