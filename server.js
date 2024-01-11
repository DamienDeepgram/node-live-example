const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
let keepAlive;

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
    // console.log("deepgram: keepalive");
    deepgram.keepAlive();
  }, 10 * 1000);

  deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
    console.log("deepgram: connected");
    connection_status = true;

    deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
      console.log("deepgram: disconnected");
      clearInterval(keepAlive);
      // need to comment out since we intentionally closed the connection with deepgram.finish()
      // deepgram.finish();
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
      // console.log("deepgram: packet received");
      // console.log("deepgram: transcript received");
      const transcript = data.channel.alternatives[0].transcript ?? "";
      console.log("socket: transcript sent to client", transcript);
      socket.emit("transcript", transcript);
      // console.log("socket: transcript data sent to client");
      // socket.emit("data", data);
    });

    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
      // console.log("deepgram: packet received");
      // console.log("deepgram: metadata received");
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
    // console.log("socket: client data received", deepgram.getReadyState());
    if(connection_status == false){
      console.log('>>> Filling audio Buffer');
      audio_buffer.push(Buffer.from(data));
    }
    if (deepgram.getReadyState() === 1 /* OPEN */) {
      // console.log("socket: data sent to deepgram");

      // Send any audio we buffered while disconnected
      if(audio_buffer.length > 0){
        console.log('>>> Sending audio Buffer');
        // Send the stored audio headers again
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
    } else if (deepgram.getReadyState() >= 2 /* 2 = CLOSING, 3 = CLOSED */) {
      console.log("socket: data couldn't be sent to deepgram");
      console.log("socket: retrying connection to deepgram");
      /* Attempt to reopen the Deepgram connection */
      // no need to handle if we intentionally closed the connection
      // deepgram.finish();
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

app.use(express.static("public/"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

server.listen(3000, () => {
  console.log("listening on localhost:3000");
});
