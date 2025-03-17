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
