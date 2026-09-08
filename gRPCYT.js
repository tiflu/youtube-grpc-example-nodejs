const PROTO_PATH = './stream_list.proto';

import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const proto = grpc.loadPackageDefinition(packageDefinition).youtube.api.v3;

// Main function
// Parameter: liveChatId, used to connect to a specific live chat.
// The liveChatId can be found through a LiveBroadcast list query. https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/list
export function gRPCStart(liveChatId) {
    const TARGET = "dns:///youtube.googleapis.com:443";
    const client = new proto.V3DataLiveChatMessageService(TARGET,
        grpc.credentials.createSsl());
    let metadata = createMetadata();
    createCall();

    // Create a gRPC call.
    // Parameter: pageToken, tells the gRPC server which chat results to return. Null returns all messages from that chat.
    function createCall(pageToken=null) {
        const call = client.StreamList(makeRequest(pageToken), metadata);
        call.on('data', (data) => {
            // TODO: Use chat data. Individual message data is stored in the data.items array.
            pageToken = data.next_page_token
        })
        call.on('end', () => {
            // The gRPC server closes the connection automatically if no chat messages are being sent
            // In the live chat. Reconnect automatically!
            createCall(pageToken);
        });
        call.on('error', (e) => {
            if (e.code === 16) {
                // Error code 16 is "Unauthenticated," likely meaning you need to refresh your access token.
                // TODO: refresh your access token.
                // Recreate metadata with updated access token
                metadata = createMetadata();
            } else {
                console.log(e);
            }
        });
    }


    function makeRequest(pageToken) {
        // This can be modified to your liking. See stream_list.proto `message LiveChatMessageListRequest` (line 16) for argument descriptions
        return {
            part: ["snippet", "id", "authorDetails"],
            live_chat_id: liveChatId,
            max_results: 20,
            page_token: pageToken
        };
    }

    function createMetadata() {
        // TODO: Get your access token from your Google Cloud OAuth client, from a database, file, etc.
        const accessToken = null;
        const metadata = new grpc.Metadata();
        metadata.add('authorization', 'Bearer ' + accessToken);
        return metadata;
    }
}