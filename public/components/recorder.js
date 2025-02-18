class VoiceRecorder {
    constructor(socket) {
        this.socket = socket;
        this.microphone = null;
        this.isRecording = false;
        this.setupListeners();
    }

    setupListeners() {
        const recordButton = document.getElementById("record");
        recordButton.addEventListener("click", async () => {
            if (!this.isRecording) {
                await this.startRecording();
            } else {
                await this.stopRecording();
            }
        });
    }

    async getMicrophone() {
        const userMedia = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        return new MediaRecorder(userMedia);
    }

    async startRecording() {
        if (!this.microphone) {
            this.microphone = await this.getMicrophone();
            
            this.microphone.onstart = () => {
                console.log("client: microphone opened");
                document.body.classList.add("recording");
                this.isRecording = true;
            };

            this.microphone.onstop = () => {
                console.log("client: microphone closed");
                document.body.classList.remove("recording");
                this.isRecording = false;
            };

            this.microphone.ondataavailable = (e) => {
                console.log("client: sent data to websocket");
                this.socket.emit("packet-sent", e.data);
            };

            await this.microphone.start(500);
        }
    }

    async stopRecording() {
        if (this.microphone) {
            this.microphone.stop();
            this.microphone = null;
        }
    }

    async pauseRecording() {
        if (this.microphone && this.isRecording) {
            await this.stopRecording();
        }
    }

    async resumeRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        }
    }
}

export default VoiceRecorder; 