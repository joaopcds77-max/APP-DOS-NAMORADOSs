/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Importações necessárias para Cloud Functions v2 do Firebase e API do Gemini
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { GoogleGenAI } = require("@google/genai");

// Inicialização do SDK Admin do Firebase
initializeApp();
const db = getFirestore();

/**
 * Cloud Function acionada automaticamente quando um novo documento
 * é inserido na coleção 'surpresas' do Firestore.
 */
exports.gerarDeclaracaoIA = onDocumentCreated("surpresas/{surpresaId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("Nenhum dado encontrado no snapshot.");
    return null;
  }

  const data = snapshot.data();
  const history = data.history || "";

  if (!history.trim()) {
    console.log("A história enviada está vazia. Abortando geração...");
    return null;
  }

  try {
    console.log(`Iniciando geração de declaração IA para o documento: ${event.params.surpresaId}`);

    // Inicialização da API do Gemini usando a apiKey armazenada nas variáveis de ambiente do Firebase.
    // Dica de produção: Configure isto usando o Google Cloud Secret Manager ou variáveis de ambiente.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Chave GEMINI_API_KEY não configurada no ambiente da Cloud Function.");
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Chamamos a API do Gemini 3.5 Flash como recomendado para tarefas eficientes de texto
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `História Bruta do Casal:\n"${history}"`,
      config: {
        systemInstruction: "Você é um assistente especializado em criar homenagens românticas. Você receberá o resumo da história de um casal. Seu trabalho é transformar esse texto bruto em uma declaração de amor altamente emocionante, poética e bem estruturada, contendo no máximo 3 parágrafos curtos. Corrija erros gramaticais e mantenha um tom profundamente apaixonado. Retorne apenas o texto final revisado."
      }
    });

    const declaracaoGerada = response.text;

    if (declaracaoGerada) {
      // Atualizamos o mesmo documento do Firestore adicionando a nova declaração
      await snapshot.ref.update({
        declaracao_ia: declaracaoGerada
      });
      console.log(`Declaração poética inserida com sucesso no Firestore: ${event.params.surpresaId}`);
    } else {
      console.warn("Retorno em branco obtido da API do Gemini.");
    }
  } catch (error) {
    console.error("Erro durante a execução da Cloud Function:", error);
  }

  return null;
});
