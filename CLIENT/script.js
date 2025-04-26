let clearingChatStatus = false

function updateChatWindow(tempAIResponse = null) {
    const chatLog = JSON.parse(localStorage.getItem('chatLog')) || [];
    const chatContainer = document.getElementById('chatLog');

    // Voeg een tijdelijke AI-reactie toe (voor streaming)
    const logToRender = tempAIResponse ? [...chatLog, {sender: 'AI', text: tempAIResponse}] : chatLog;


    if (clearingChatStatus) {
        clearingChatStatus = false;
    }
    // Herschrijf de inhoud van de chatlog met HTML
    // chatContainer.innerHTML = logToRender.map(entry => `<div>${entry.sender}:${entry.text}</div>`).join('');
    chatContainer.innerHTML = Object.entries(logToRender).map(([key, value]) =>
        value.sender === 'AI'
            ? `<div class="ai-container "><img src="lara-3d-model.png" class="laraImage"/><strong></strong> ${value.text}</div>`
            : `<div class="human-container">${value.text}</div>`
    ).join('');


}

function askScheduledQuestions() {
    const currentMinute = new Date().getMinutes();
    const currentHours = new Date().getHours();
    const currentTime = `${currentHours}:${currentMinute}`
    console.log(currentTime)
}
askScheduledQuestions()


const clearChat = document.getElementById('clearChat');
clearChat.addEventListener('click', async () => {
    localStorage.clear('chatLog'); // Alleen 'chatLog' verwijderen, niet alles
    clearingChatStatus = true;
    const chatContainer = document.getElementById('chatLog');
    chatContainer.innerHTML = ''; // Maak het venster leeg
})


// Functie om ingevoerde prompts te verwerken
async function handleFormSubmission(event) {
    event.preventDefault(); // Voorkom standaard formulierverzending

    const promptInput = document.getElementById('promptInput');

    const submitButton = document.getElementById('submitButton');
    const clearChatButton = document.getElementById('clearChat');
    const chatContainer = document.getElementById('chatLog');
    const promptValue = promptInput.value;

    // Voeg het gebruikersbericht toe aan de chatlog en werk Local Storage bij
    const chatLog = JSON.parse(localStorage.getItem('chatLog')) || [];

    if (clearingChatStatus) {
        chatContainer.innerHTML = `<div class="ai-container chat-line"><img src="lara-3d-model.png" class="laraImage"/>Hoi! Hoe kan ik je helpen vandaag? 😊</div>`;
        clearingChatStatus = false; // Reset clearingChatStatus
        return;
    }


    promptInput.value = ''; // Maak het invoerveld leeg
    chatLog.push({sender: 'You', text: promptValue});
    localStorage.setItem('chatLog', JSON.stringify(chatLog));


    updateChatWindow(); // Update het venster na gebruikersinvoer

    try {
        // Stuur de prompt naar de server
        const response = await fetch('http://localhost:3000/ask', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prompt: promptValue, history: chatLog.slice(0,-1)})
        });

        if (response.ok) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let aiResponse = '';

            while (true) {
                // Wacht totdat deze vlag is vrijgegeven voordat je een nieuwe call toestaat of initieert.
                clearChatButton.style.backgroundColor = 'lightgray';
                clearChatButton.disabled = true;
                clearChatButton.innerText = 'Wait for the prompt to be done';

                submitButton.disabled = true;
                submitButton.innerText = 'Prompting...';
                submitButton.style.backgroundColor = 'lightgray';



                const {done, value} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, {stream: true});

                // Voeg streamdata (per woord) toe aan het responsenlog
                for (const word of chunk.split(/(\s+)/)) {
                    aiResponse += word + '';
                    updateChatWindow(aiResponse.trim()); // Werk de chatlog live bij
                    await new Promise(resolve => setTimeout(resolve, 20)); // Simuleer vertraging

                    // Zorg de container meescrollt bij t streamen
                    const chatContainer = document.getElementById('chatLog');
                    chatContainer.scrollTo(0, chatContainer.scrollHeight);
                }
            }

            clearChatButton.style.backgroundColor = '#0077ff'
            clearChatButton.disabled = false;
            clearChatButton.innerText = 'Clear chat';

            submitButton.style.backgroundColor = '#0077ff'
            submitButton.disabled = false;
            submitButton.innerText = 'Versturen';



            // Voeg de uiteindelijke AI-respons toe aan de chatlog en werk Local Storage bij
            chatLog.push({sender: 'AI', text: aiResponse.trim()});


            localStorage.setItem('chatLog', JSON.stringify(chatLog));


            updateChatWindow();

        } else {
            console.error('Fout bij verzoek:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Netwerkfout:', error);
    }
}

// Chatvenster bijwerken bij paginaladen
document.addEventListener('DOMContentLoaded', () => {
    updateChatWindow()
});




// Voeg een event listener toe voor het formulier
document.getElementById('chatForm').addEventListener('submit', handleFormSubmission);