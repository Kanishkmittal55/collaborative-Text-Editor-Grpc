.PHONY: generate-frontend-proto \
        generate-diagram-service-backend-proto \
        generate-text-editor-service-backend-proto \
        up \
        down

PROTOC_GEN_JS = frontend/node_modules/.bin/protoc-gen-js
PROTOC_GEN_GRPC_WEB = frontend/node_modules/.bin/protoc-gen-grpc-web

PROTO_SRC = collabTexteditorService/collabTexteditorService.proto \
            collabTexteditorService/collabDiagrameditorService.proto

OUT_DIR_FRONTEND = frontend/src

generate-frontend-proto:
	protoc \
		--plugin=protoc-gen-js=$(PROTOC_GEN_JS) \
		--plugin=protoc-gen-grpc-web=$(PROTOC_GEN_GRPC_WEB) \
		--proto_path=collabTexteditorService \
		--js_out=import_style=commonjs:$(OUT_DIR_FRONTEND) \
		--grpc-web_out=import_style=commonjs,mode=grpcwebtext:$(OUT_DIR_FRONTEND) \
		$(PROTO_SRC)

PROTO_SRC_BACKEND = collabDiagrameditorService.proto
OUT_DIR_BACKEND = collabTextEditorService
PROTO_DIR := collabTexteditorService

generate-diagram-service-backend-proto:
	@echo "Generating Go gRPC code for diagram service..."
	protoc \
		-I=$(PROTO_DIR) \
		--go_out=paths=source_relative:$(OUT_DIR_BACKEND) \
		--go-grpc_out=paths=source_relative:$(OUT_DIR_BACKEND) \
		$(PROTO_DIR)/$(PROTO_SRC_BACKEND)

generate-text-editor-service-backend-proto:
	@echo "Generating Go gRPC code for Text Editor Service"
	protoc \
		-I collabTexteditorService \
		--go_out=plugins=grpc:collabTexteditorService \
		collabTexteditorService/collabTexteditorService.proto

up:
	@docker-compose -f docker-compose.dev.yml -f docker-compose.yml up --build

down:
	@docker-compose down
