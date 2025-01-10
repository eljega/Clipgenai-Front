const predefinedResponses = {
    "¿Cómo usar la aplicación?": [
        "Para usar la aplicación, sigue estos pasos:",
        "1. Ingresa a la pestaña 'Generar Guion' para crear un guion para tu video.",
        "2. Ingresa a la pestaña 'Ingresar Guion' si ya tienes un guion listo.",
        "3. Configura tus claves API en la pestaña 'Configuración' antes de generar guiones o videos.",
        "4. Utiliza la pestaña 'Generar Imágenes' para obtener imágenes para tu video basadas en el guion.",
        "5. Usa la pestaña 'Generar Video' para combinar tus imágenes, videos y guion en un video completo.",
        "6. Si deseas añadir subtítulos, ve a la pestaña 'Generar Subtítulos' una vez que el video esté generado.",
        "7. Puedes ver y gestionar tus videos en la pestaña 'Mis Videos'.",
    ],
    "Problemas con API": [
        "Si tienes problemas con tus claves API, asegúrate de que:",
        "1. Has ingresado las claves correctamente en la pestaña 'Configuración'.",
        "2. Las claves API no han expirado.",
        "3. Tienes acceso a la API correspondiente.",
        "4. Si el problema persiste, intenta regenerar las claves API desde la plataforma correspondiente."
    ],
    "Soporte": [
        "Para soporte técnico, puedes contactarnos a través del siguiente correo: soporte@clipgen.ai.",
        "Estamos aquí para ayudarte con cualquier problema que encuentres."
    ],
    "Generar Imágenes": [
        "Para generar imágenes, sigue estos pasos:",
        "1. Ingresa el guion en la pestaña 'Generar Guion' o 'Ingresar Guion'.",
        "2. Ve a la pestaña 'Generar Imágenes'.",
        "3. Selecciona las opciones de contenido (imágenes, videos o mixto).",
        "4. Si seleccionaste 'Personal', sube tus propias imágenes o videos.",
        "5. Haz clic en 'Generar' para obtener las imágenes basadas en el guion.",
    ],
    "Generar Video": [
        "Para generar un video, sigue estos pasos:",
        "1. Ingresa el guion en la pestaña 'Generar Guion' o 'Ingresar Guion'.",
        "2. Ve a la pestaña 'Generar Video'.",
        "3. Selecciona las imágenes y videos que deseas usar.",
        "4. Configura las opciones de voz y música.",
        "5. Haz clic en 'Generar Video' para crear el video.",
    ],
    "Generar Subtítulos": [
        "Para añadir subtítulos a tu video, sigue estos pasos:",
        "1. Ve a la pestaña 'Mis Videos'.",
        "2. Selecciona el video al que deseas añadir subtítulos.",
        "3. Haz clic en 'Generar Subtítulos'.",
        "4. Espera a que se procese y añade los subtítulos automáticamente.",
    ],
};

function toggleChatbot() {
    const chatbotContainer = document.getElementById('chatbotContainer');
    const chatbotToggle = document.getElementById('chatbotToggle');
    if (chatbotContainer.style.display === 'none' || chatbotContainer.style.display === '') {
        chatbotContainer.style.display = 'flex';
        chatbotToggle.style.right = '320px';
    } else {
        chatbotContainer.style.display = 'none';
        chatbotToggle.style.right = '20px';
    }
}

function handleQuestion(question) {
    const chatbotMessages = document.getElementById('chatbotMessages');
    chatbotMessages.innerHTML = '';

    if (predefinedResponses[question]) {
        predefinedResponses[question].forEach(response => {
            const botMessage = document.createElement('div');
            botMessage.className = 'bot-message';
            botMessage.textContent = response;
            chatbotMessages.appendChild(botMessage);
        });
    } else {
        const botMessage = document.createElement('div');
        botMessage.className = 'bot-message';
        botMessage.textContent = "Lo siento, no tengo una respuesta para eso. Intenta con otra pregunta.";
        chatbotMessages.appendChild(botMessage);
    }

    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function sendMessage() {
    const chatbotInput = document.getElementById('chatbotInput');
    const message = chatbotInput.value.trim();
    if (message === '') {
        return;
    }

    const chatbotMessages = document.getElementById('chatbotMessages');
    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = message;
    chatbotMessages.appendChild(userMessage);

    chatbotInput.value = '';

    handleQuestion(message);

    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}
