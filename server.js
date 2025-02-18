const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const dotenv = require("dotenv");
dotenv.config();

// Import routes
const notesRouter = require('./server/routes/notes');
const prescriptionsRouter = require('./server/routes/prescriptions');
const schedulingRouter = require('./server/routes/scheduling');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
let keepAlive;

// Middleware
app.use(express.json());
app.use(express.static("public/"));

// Routes
app.use('/api/notes', notesRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/scheduling', schedulingRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// Deepgram setup and WebSocket handling
let connection_status = false;
let audio_buffer = [];
let disconnect_tested = false;
let packetZero = new Uint8Array([]);

const setupDeepgram = (socket) => {
    console.log('Connecting to Deepgram');
    let deepgram = deepgramClient.listen.live({
        language: "en",
        punctuate: true,
        smart_format: true,
        model: "nova",
        encoding: 'webm-opus',
        sample_rate: 48000,
        channels: 1
    });

    // Simulate Connection closing after 10 seconds
    setTimeout(()=>{
        if(connection_status == true && disconnect_tested == false){
            console.log('>>> Forced Disconnect');
            deepgram.finish();
            disconnect_tested = true;
        }
    }, 10 * 1000)

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
        deepgram.keepAlive();
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
        console.log("deepgram: connected");
        connection_status = true;

        deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
            console.log("deepgram: disconnected");
            clearInterval(keepAlive);
            connection_status = false;
        });

        deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
            console.log("deepgram: error recieved");
            console.error(error);
        });

        deepgram.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
            console.log("deepgram: warning recieved");
            console.warn(warning);
        });

        deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
            const transcript = data.channel.alternatives[0].transcript ?? "";
            console.log("socket: transcript sent to client", transcript);
            socket.emit("transcript", transcript);
        });

        deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
            console.log("socket: metadata sent to client RequestID: ", data.request_id);
            socket.emit("metadata", data);
        });
    });

    return deepgram;
};

io.on("connection", (socket) => {
    console.log("socket: client connected");
    let deepgram = setupDeepgram(socket);

    socket.on("packet-sent", (data) => {
        if(connection_status == false){
            console.log('>>> Filling audio Buffer');
            audio_buffer.push(Buffer.from(data));
        }
        if (deepgram.getReadyState() === 1) {
            if(audio_buffer.length > 0){
                console.log('>>> Sending audio Buffer');
                deepgram.send(packetZero);

                audio_buffer.forEach((buffered_data)=>{
                    deepgram.send(buffered_data);
                });
                audio_buffer = [];
            }

            if(packetZero.length == 0){
                packetZero = Buffer.from(data);
            }
            deepgram.send(data);
        } else if (deepgram.getReadyState() >= 2) {
            console.log("socket: data couldn't be sent to deepgram");
            console.log("socket: retrying connection to deepgram");
            deepgram.removeAllListeners();
            deepgram = setupDeepgram(socket);
        } else {
            console.log("socket: data couldn't be sent to deepgram. Ready State: ", deepgram.getReadyState());
        }
    });

    socket.on("disconnect", () => {
        console.log("socket: client disconnected");
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = null;
    });
});

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

server.listen(3000, () => {
    console.log("listening on localhost:3000");
});
