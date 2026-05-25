import { ChatOllama } from "@langchain/ollama";

async function test() {
    const model = new ChatOllama({
        model: "gpt-oss:120b-cloud",
        temperature: 0.7,
    });

    const response = await model.invoke("Di setup exitoso");
    console.log("El modelo responde:", response.content);
}

test().catch(console.error);
