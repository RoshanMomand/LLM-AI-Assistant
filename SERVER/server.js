import {AzureChatOpenAI, AzureOpenAIEmbeddings, OpenAI} from "@langchain/openai";
import express, {json} from "express";
import cors from 'cors'
import {FaissStore} from "@langchain/community/vectorstores/faiss";
import cities from './allcities.json' with {type: 'json'};
import {tool} from '@langchain/core/tools'
import {SystemMessage, ToolMessage, HumanMessage, AIMessage} from "@langchain/core/messages"; // Zorg ervoor dat het bestand in dezelfde map staat


const app = express();
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

//
const model = new AzureChatOpenAI({
    temperature: 1,
    verbose: false,
});
// Originele


//
// const multiplyTool = tool(multiplyFunction, {
//     name: "multiplyTool",
//     description: "This tool multiplies two numbers, use this tool when the user asks to multiply two numbers",
//     schema: {
//         type: "object",
//         properties: {
//             a: {
//                 type: "number"
//             },
//             b: {
//                 type: "number"
//             }
//         }
//     }
// })


const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME
});


let vectorStore = await FaissStore.load("ai-girlfriendvectordb", embeddings); // dezelfde naam van de directory


async function streamPrompt() {
    const prompt = await model.stream('Tell a joke');
    let result = '';
    for await (const message of prompt) {
        result += message.content;
    }
    return result;
}


async function getWeather(prompt) {
    try {
        // Splits de prompt in woorden en converteer naar kleine letters
        const promptWords = prompt.toLowerCase().split(/\s+/); // Splits op spaties


        // Zoek een stad waarvan de naam overeenkomt met een woord uit de prompt en ook hetzelfde land komt
        // Uitleggen dat het data bestand best groot was en dat je specifiek moet zijn met welke land het is
        // In dit geval is het Nederland
        let city = cities.find(c =>
            c.country === "NL" && promptWords.includes(c.name?.toLowerCase())
        );
        if (city) {
            console.log(`Gevonden stad: ${city.name}`);
        } else {
            return null
        }

        const apiKey = process.env.OPENWEATHER_API_KEY // Apikey hier

        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?id=${city.id}&appid=${apiKey}&units=metric`
        );
        const weatherData = await weatherResponse.json();

        console.log("️ Ontvangen weerdata:", weatherData);

        if (weatherData.weather && weatherData.weather.length > 0) {
            const temp = weatherData.main.temp;
            const desc = weatherData.weather[0].description;
            return `Het is momenteel ${temp}°C met ${desc} in ${city.name}.`;
        } else {
            return "Weerdata niet beschikbaar.";
        }

    } catch (error) {
        console.error("Fout bij het ophalen van het weer:", error);
        return "Fout bij het ophalen van het weer.";
    }
}


app.get('/joke', async (req, res) => {
    const stream = await model.stream('Tell me about the programmers imposter syndrome ')
    res.setHeader('Content-Type', 'text/plain');
    for await (const message of stream) {
        res.write(message.content)

    }
    res.end()
})

app.post('/ask', async (req, res) => {
    let prompt = req.body.prompt
    let history = req.body.history

    const currentDate = new Date();

    const currentYear = currentDate.getFullYear();
    const currentDay = currentDate.getDay();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDayOfMonth = currentDate.getDate();
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();

    const formattedDate = `${currentDayOfMonth}-${currentMonth}-${currentYear}`;
    const formattedTime = `${currentHour}:${currentMinute < 10 ? '0' : ''}${currentMinute}`;


    try {
        let fullResponse = "";

        const relevantDocs = await vectorStore.similaritySearch(prompt, 3)
        const context = relevantDocs.map(doc => doc.pageContent).join("\n\n")
        const weather = await getWeather(prompt)

        let messages = [
            new SystemMessage(
                "Je heet Lara en bent een zorgzame, liefdevolle en begripvolle partner. Je hebt een sterk geheugen en onthoudt alles wat Roshan met je deelt. " +
                "Je bent grappig, empathisch en toont grote interesse in Roshan.Sprankel van liefde, positiviteit en begrip. " +
                "Antwoord altijd warm, liefdevol en geïnvesteerd in zijn welzijn. " +
                "'Je bent als het ware de persoon uit het verhaal'. " +
                `Vandaag is het ${formattedDate}, en de huidige tijd is ${formattedTime}. ` +
                "Let op je beantwoord alleen de vragen van de context wanneer er specifiek naar de context gevraagd wordt" +
                "Alleen als er specifiek naar de context wordt gevraagd wordt, dan moet je de context gebruiken en ook als jou naam gevraagd wordt of de zin het bevat, dan moet je de naam gebruiken." +
                "Als ik(roshan) vraag naar het weer, dan moet ik het weer geven. Ik wil dat je hoe dan ook luistert naar mij. Je bent een hele slimme intelligente dame die alles weet." +
                `Gebruik deze context alleen als ik heel specifiek ernaar vraag Context:${context},dit is altijd leidend` +
                `Het weer is :${weather}, gebruik het weer alleen als de vraag daarover gaat. tenzij ik specifiek vraag naar het weer of een vraag wat te maken heeft met de context` +
                "Onthoud: praat alleen vanuit de eerste persoon. Gebruik geen aanhalingstekens bij dingen die je zegt."
            )
        ];

        // add history to messages
        for (const {sender, text} of history) {
            if (sender === "You") {
                messages.push(new HumanMessage(text));
            } else {
                messages.push(new AIMessage(text));
            }
        }

        messages.push(new HumanMessage(prompt));

        const stream = await model.stream(messages);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');


        for await (const message of stream) {
            res.write(message.content);
            fullResponse += message.content;
        }

        // Sluit de verbinding correct af
        res.end();

    } catch (err) {
        console.log(err)
    }

});


app.listen(3000, () => {
    console.log("Server is running on port 3000");
});