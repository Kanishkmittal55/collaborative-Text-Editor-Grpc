# Makefile
# This Makefile is placed at the project root: collaborative-text-editor-master/

# Define variables pointing to:
#  - the plugin executables in the 'frontend/node_modules/.bin' folder
#  - the source .proto file
#  - the destination folder for generated JS stubs
PROTOC_GEN_JS = frontend/node_modules/.bin/protoc-gen-js
PROTOC_GEN_GRPC_WEB = frontend/node_modules/.bin/protoc-gen-grpc-web

PROTO_SRC = collabTextEditorService/collabTexteditorService.proto
OUT_DIR = frontend/src  # Where the .js files will be placed

generate-frontend-proto:
	protoc \
		--plugin=protoc-gen-js=$(PROTOC_GEN_JS) \
		--plugin=protoc-gen-grpc-web=$(PROTOC_GEN_GRPC_WEB) \
		--proto_path=collabTextEditorService \
		--js_out=import_style=commonjs:$(OUT_DIR) \
		--grpc-web_out=import_style=commonjs,mode=grpcwebtext:$(OUT_DIR) \
		$(PROTO_SRC)


PROTO_SRC_2 = collabDiagrameditorService.proto
OUT_DIR = collabTextEditorService
PROTO_DIR := collabTexteditorService
generate-diagram-service-backend-proto:
	@echo "Generating Go gRPC code for diagram service..."
	protoc \
		-I=$(PROTO_DIR) \
		--go_out=paths=source_relative:$(OUT_DIR) \
		--go-grpc_out=paths=source_relative:$(OUT_DIR) \
		$(PROTO_DIR)/$(PROTO_SRC_2)


generate-text-editor-service-backend-proto:
	@echo "Generating Go gRPC code for Text Editor Service"
	protoc \
		 -I collabTexteditorService/collabTexteditorService/collabTexteditorService.proto --go_out=plugins=grpc:collabTexteditorService


up:
	@docker-compose -f docker-compose.dev.yml -f docker-compose.yml up --build


down:
	@docker-compose down