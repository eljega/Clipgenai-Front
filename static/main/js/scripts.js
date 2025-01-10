function showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-center ${type}`;
    alert.role = 'alert';
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.classList.add('show');
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 500); // Permitimos tiempo para animación de salida
        }, 10000);
    }, 10); // Delay
}

function showError(message) {
    showAlert('alert-danger', message);
}

function showSuccess(message) {
    showAlert('alert-success', message);
}

function hideError() {
    const errorMessage = document.querySelector('.alert-danger');
    if (errorMessage) {
        errorMessage.classList.remove('show');
        setTimeout(() => errorMessage.remove(), 500);
    }
}




function suggestTitles() {
    const title = document.getElementById('inputTitle').value.trim();
    const language = document.getElementById('inputLanguage').value;

    if (title === "") {
        showError("Para sugerirte un título, por favor ingresa un título de tu video.");
        return;
    }

    if (!areApiKeysSet()) {
        showError("Por favor, configura tus claves API antes de continuar.");
        return;
    }


    fetch('/suggest_titles/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, language })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.errors.join(", "));
            });
        }
        return response.json();
    })
    .then(data => {
        const titles = data.titles;
        const titleSuggestions = document.getElementById('titleSuggestions');
        titleSuggestions.innerHTML = '';

        if (titles.length === 0) {
            showError("No se pudieron generar títulos. Por favor, verifica el título.");
        } else {
            titles.forEach(title => {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion-item';
                suggestion.textContent = title;
                suggestion.onclick = () => {
                    document.getElementById('inputTitle').value = title;
                    titleSuggestions.innerHTML = '';
                };
                titleSuggestions.appendChild(suggestion);
            });
            hideError();
        }

        //pass
    })
    .catch(error => {
        showError("Error: " + error.message);
        //pass
    });
}




// Mostrar la animación de carga y deshabilitar los botones
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.querySelectorAll('button').forEach(button => button.disabled = true);
}

// Ocultar la animación de carga y habilitar los botones
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.querySelectorAll('button').forEach(button => button.disabled = false);
}



let totalVideosToGenerate = 1;
let currentVideoIndex = 1;
let videosQueue = [];
let tasksInProgress = [];
let previousTasksStatus = {};
let pendingTaskIds = [];



function fetchTasksInProgress() {
    fetch('/get_tasks_status/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        const allTasks = data.tasks || [];
        tasksInProgress = allTasks.filter(task => task.status === 'PENDING' || task.status === 'PROGRESS');
        updateVideosInProgress();
    })
    .catch(error => {
        console.error('Error al obtener las tareas en progreso:', error);
    });
}

function pollTasksStatus() {
    fetch('/get_tasks_status/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        const newTasksInProgress = data.tasks || [];
        let shouldFetchVideos = false;

        pendingTaskIds = pendingTaskIds.filter(taskId => {
            const task = newTasksInProgress.find(task => task.task_id === taskId);
            if (!task || task.status === 'SUCCESS' || task.status === 'FAILURE') {
                hideTaskProgress(taskId);
                return false;
            }
            return true;
        });

        newTasksInProgress.forEach(task => {
            const previousStatus = previousTasksStatus[task.task_id];
            if ((previousStatus === 'PROGRESS' || previousStatus === 'PENDING') && (task.status === 'SUCCESS' || task.status === 'FAILURE')) {
                shouldFetchVideos = true;

                // Mostrar mensajes al usuario
                if (task.status === 'SUCCESS') {
                    showSuccess(`El video "${task.title}" se ha generado correctamente.`);
                } else if (task.status === 'FAILURE') {
                    const errorMsg = task.meta.error || 'Ha ocurrido un error al generar el video.';
                    showError(`Error al generar el video "${task.title}": ${errorMsg}`);
                }
            }

            previousTasksStatus[task.task_id] = task.status;
        });

        tasksInProgress = newTasksInProgress.filter(task => task.status === 'PENDING' || task.status === 'PROGRESS');

        updateVideosInProgress();

        if (shouldFetchVideos) {
            fetchVideos();
        }
    })
    .catch(error => {
        console.error('Error al obtener el estado de las tareas:', error);
    });
}

// Aseguramos que exista el contenedor de tareas en progreso
document.addEventListener('DOMContentLoaded', function() {
    const yourVideosTab = document.getElementById('your-videos');
    if (yourVideosTab) {
        if (!yourVideosTab.querySelector('#inProgressTasks')) {
            const tasksContainer = document.createElement('div');
            tasksContainer.id = 'inProgressTasks';
            const existingVideos = yourVideosTab.querySelector('#existingVideos');
            if (existingVideos) {
                yourVideosTab.insertBefore(tasksContainer, existingVideos);
            } else {
                yourVideosTab.appendChild(tasksContainer);
            }
        }
    }
});

function updateVideosInProgress() {
    console.log('Actualizando videos en progreso:', tasksInProgress);
    
    let inProgressContainer = document.getElementById('inProgressTasks');
    if (!inProgressContainer) {
        const yourVideosTab = document.getElementById('your-videos');
        if (yourVideosTab) {
            inProgressContainer = document.createElement('div');
            inProgressContainer.id = 'inProgressTasks';
            yourVideosTab.insertBefore(inProgressContainer, yourVideosTab.firstChild);
        }
    }

    if (!inProgressContainer) {
        console.error('No se pudo encontrar o crear el contenedor de tareas en progreso');
        return;
    }

    const progressMapping = {
        'Iniciando generación de video': 10,
        'Generando guion': 20,
        'Procesando imágenes y videos': 40,
        'Generando audio': 60,
        'Seleccionando música': 70,
        'Creando video': 80,
        'Guardando video en la base de datos': 90,
        'Subiendo video a S3': 95,
        'Generando subtítulos': 100
    };

    tasksInProgress.forEach(task => {
        let progressPercentage = 0;
        let currentStep = '';

        if (task.status === 'PROGRESS') {
            currentStep = task.meta.current_step || 'En progreso';
            progressPercentage = progressMapping[currentStep] || 10;
        } else if (task.status === 'PENDING') {
            currentStep = 'Generando guion y descargando imágenes';
            progressPercentage = 20;
        }

        console.log(`Tarea: ${task.title}, Estado: ${currentStep}, Progreso: ${progressPercentage}%`);

        let taskProgressItem = inProgressContainer.querySelector(`.task-progress[data-task-id="${task.task_id}"]`);
        
        if (!taskProgressItem) {
            taskProgressItem = document.createElement('div');
            taskProgressItem.className = 'video-item in-progress task-progress';
            taskProgressItem.setAttribute('data-task-id', task.task_id);

            taskProgressItem.innerHTML = `
                <h4>${task.title}</h4>
                <p class="status">Estado: ${currentStep}</p>
                <div class="progress">
                    <div class="progress-bar progress-bar-striped bg-success" 
                         role="progressbar" 
                         style="width: ${progressPercentage}%;" 
                         aria-valuenow="${progressPercentage}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
            `;
            inProgressContainer.appendChild(taskProgressItem);
        } else {
            const progressBar = taskProgressItem.querySelector('.progress-bar');
            const statusText = taskProgressItem.querySelector('.status');
            
            if (progressBar && statusText) {
                progressBar.style.width = `${progressPercentage}%`;
                progressBar.setAttribute('aria-valuenow', progressPercentage);
                statusText.innerText = `Estado: ${currentStep}`;
            }
        }
    });
}



function startVideoGenerationQueue() {
    processNextVideoInQueue();
}

function showUploadProgress() {
    const inProgressContainer = document.getElementById('inProgressTasks');

    if (inProgressContainer.querySelector('.upload-progress')) return;

    const uploadProgressItem = document.createElement('div');
    uploadProgressItem.className = 'video-item in-progress upload-progress';
    uploadProgressItem.innerHTML = `
        <h4>Subiendo archivos...</h4>
        <p class="status">Estado: Subiendo archivos, por favor espera...</p>
        <div class="progress">
            <div class="progress-bar progress-bar-striped bg-info" role="progressbar" style="width: 100%;" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
    `;
    inProgressContainer.appendChild(uploadProgressItem);
}

function hideUploadProgress() {
    const uploadProgressItem = document.querySelector('.upload-progress');
    if (uploadProgressItem) uploadProgressItem.remove();
}

function showTaskProgress(taskId, title) {
    const inProgressContainer = document.getElementById('inProgressTasks');

    const taskProgressItem = document.createElement('div');
    taskProgressItem.className = 'video-item in-progress task-progress';
    taskProgressItem.setAttribute('data-task-id', taskId);
    taskProgressItem.innerHTML = `
        <h4>${title}</h4>
        <p class="status">Estado: En progreso</p>
        <div class="progress">
            <div class="progress-bar progress-bar-striped bg-success" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
    `;
    inProgressContainer.appendChild(taskProgressItem);
}

function hideTaskProgress(taskId) {
    const taskProgressItem = document.querySelector(`.task-progress[data-task-id="${taskId}"]`);
    if (taskProgressItem) taskProgressItem.remove();
}

function processNextVideoInQueue() {
    if (videosQueue.length === 0) {
        showSuccess("Todos los videos han sido enviados para su generación.");
        currentVideoIndex = 1;
        totalVideosToGenerate = 1;
        return;
    }

    const videoData = videosQueue.shift();

    const formData = new FormData();
    formData.append('title', videoData.title);
    formData.append('referenceLink', videoData.referenceLink);
    formData.append('script', videoData.script);
    formData.append('subtitlePosition', videoData.subtitle_position);
    formData.append('orientation', videoData.orientation);
    formData.append('language', videoData.language);
    formData.append('voiceType', videoData.voiceType);
    formData.append('voice', videoData.voice);
    formData.append('music_option', videoData.musicOption);
    formData.append('content_option', videoData.contentOption);
    formData.append('subtitle_option', videoData.subtitleOption);
    formData.append('duration', videoData.duration);

    if (videoData.contentOption === 'personal') {
        const folderInput = document.getElementById('personalFolder');
        const files = folderInput.files;

        for (let i = 0; i < files.length; i++) {
            formData.append('personalFolder', files[i]);
        }
    }

    // Mostrar la barra de subida antes de enviar la solicitud
    showUploadProgress();

    fetch('/generate_script/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const taskId = data.task_id;
        if (taskId) {
            // Ocultamos la barra de subida una vez recibido el task_id
            hideUploadProgress();

            // Mostramos la barra de progreso de la tarea
            showTaskProgress(taskId, videoData.title);
            pendingTaskIds.push(taskId);

            // Procesar el siguiente video en la cola
            processNextVideoInQueue();
        } else {
            hideUploadProgress();
            showError("No se recibió un task_id.");
            processNextVideoInQueue();
        }
    })
    .catch(error => {
        console.log('Fetch error:', error);
        hideUploadProgress();
        showError(`Error: ${error.message}`);
        processNextVideoInQueue();
    });
}




function changeCredentials() {
    const newUsername = document.getElementById('newUsername').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    fetch('/change_credentials/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            new_username: newUsername,
            current_password: currentPassword,
            new_password: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
        } else if (data.error) {
            alert(data.error);
        }
    })
    .catch(error => console.error('Error:', error));
}




function saveVideo() {
    const videoURL = document.getElementById('generatedVideo').src;
    const link = document.createElement('a');
    link.href = videoURL;
    link.download = 'video-generado.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetForm() {
    document.getElementById('generateForm').reset();
    document.getElementById('uploadForm').reset();
    document.getElementById('scriptSection').classList.add('d-none');
    document.getElementById('imagesSection').classList.add('d-none');
    document.getElementById('videoSection').classList.add('d-none');
    hideError();
}


document.addEventListener('DOMContentLoaded', function() {
    // Verifico si la estructura del tab de videos existe
    const yourVideosTab = document.getElementById('your-videos');
    if (yourVideosTab) {
        // Aseguro de que tiene la estructura correcta
        if (!yourVideosTab.querySelector('#inProgressTasks')) {
            const inProgressContainer = document.createElement('div');
            inProgressContainer.id = 'inProgressTasks';
            yourVideosTab.appendChild(inProgressContainer);
        }
        
        if (!yourVideosTab.querySelector('#existingVideos')) {
            const videosContainer = document.createElement('div');
            videosContainer.id = 'existingVideos';
            yourVideosTab.appendChild(videosContainer);
        }
    }
});


function fetchVideos() {
    console.log('Fetching videos...');

    // Asegurarnos de que el contenedor existe
    let existingVideosContainer = document.getElementById('existingVideos');
    if (!existingVideosContainer) {
        // Si no existe, intentar crearlo
        const yourVideosTab = document.getElementById('your-videos');
        if (yourVideosTab) {
            existingVideosContainer = document.createElement('div');
            existingVideosContainer.id = 'existingVideos';
            yourVideosTab.appendChild(existingVideosContainer);
        }
    }

    // Solo proceder si tenemos el contenedor
    if (!existingVideosContainer) {
        console.error('No se pudo encontrar o crear el contenedor de videos');
        return;
    }

    fetch('/get_uservideos/')
        .then(response => {
            console.log('Response received', response);
            if (!response.ok) {
                throw new Error('Error al obtener los videos');
            }
            return response.json();
        })
        .then(data => {
            console.log('Videos fetched:', data);
            
            existingVideosContainer = document.getElementById('existingVideos');
            if (!existingVideosContainer) {
                throw new Error('El contenedor de videos no está disponible');
            }

            existingVideosContainer.innerHTML = '';

            if (!data.videos || data.videos.length === 0) {
                existingVideosContainer.innerHTML = '<p>No tienes videos almacenados.</p>';
            } else {
                data.videos.forEach(video => {
                    const videoItem = document.createElement('div');
                    videoItem.className = 'video-item';
                    videoItem.innerHTML = `
                        <h4>${video.title}</h4>
                        <video width="320" height="240" controls>
                            <source src="${video.service_url}" type="video/mp4">
                            Tu navegador no soporta el elemento de video.
                        </video>
                    <div class="button-container">
                        <button class="bin-button" onclick="deleteVideo(${video.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 39 7" class="bin-top">
                                <line stroke-width="4" stroke="white" y2="5" x2="39" y1="5"></line>
                                <line stroke-width="3" stroke="white" y2="1.5" x2="26.0357" y1="1.5" x1="12"></line>
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 33 39" class="bin-bottom">
                                <mask fill="white" id="path-1-inside-1_8_19">
                                    <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
                                </mask>
                                <path mask="url(#path-1-inside-1_8_19)" fill="white" d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"></path>
                                <path stroke-width="4" stroke="white" d="M12 6L12 29"></path>
                                <path stroke-width="4" stroke="white" d="M21 6V29"></path>
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 89 80" class="garbage">
                                <path fill="white" d="M20.5 10.5L37.5 15.5L42.5 11.5L51.5 12.5L68.75 0L72 11.5L79.5 12.5H88.5L87 22L68.75 31.5L75.5066 25L86 26L87 35.5L77.5 48L70.5 49.5L80 50L77.5 71.5L63.5 58.5L53.5 68.5L65.5 70.5L45.5 73L35.5 79.5L28 67L16 63L12 51.5L0 48L16 25L22.5 17L20.5 10.5Z"></path>
                            </svg>
                        </button>
                        <button class="Btn" onclick="downloadVideo('${video.download_url}')">
                            <svg class="svgIcon" viewBox="0 0 384 512" height="1em" xmlns="http://www.w3.org/2000/svg">
                                <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"></path>
                            </svg>
                            <span class="icon2"></span>
                            <span class="tooltip">Download</span>
                        </button>
                    </div>
                    `;
                    existingVideosContainer.appendChild(videoItem);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching videos:', error);
            const container = document.getElementById('existingVideos');
            if (container) {
                container.innerHTML = '<p class="text-danger">Error al cargar los videos. Por favor, intenta de nuevo.</p>';
            }
        });
}

document.getElementById('your-videos-tab').addEventListener('show.bs.tab', function (e) {
    console.log('Videos tab shown');
    fetchVideos();
    updateVideosInProgress();
});




function downloadVideo(videoUrl) {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = 'video-generado.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadVideo(videoUrl) {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = 'video-generado.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}




document.getElementById('your-videos-tab').addEventListener('click', () => {
    console.log('Your videos tab clicked');
    fetchVideos();
    updateVideosInProgress();
});




function deleteVideo(videoId) {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    fetch(`/delete_video/${videoId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Video deleted') {
            fetchVideos();
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting video:', error);
        showError('Error al eliminar el video.');
    });
}


function showUpgradePanel() {
    const panel = document.getElementById('upgradePanel');
    panel.style.display = 'block';
  
    fetch('/get-plans-json/')
      .then(response => response.json())
      .then(data => {
        const container = document.getElementById('plansContainer');
        container.innerHTML = '';
  
        data.plans.forEach(plan => {
          const planDiv = document.createElement('div');
          planDiv.classList.add('plan-item');
          planDiv.innerHTML = `
            <h3>${plan.name}</h3>
            <p><strong style="color: #87F414;">$${plan.price}/mes</strong></p>
            <p style="white-space: pre-line;">${plan.description}</p>
            <p><strong>Minutos incluidos:</strong> ${plan.minutes_included}</p>
            <button class="btn btn-primary" onclick="subscribePlan(${plan.id})" style="margin-top: 10px;">
              Suscribirme
            </button>
          `;
          container.appendChild(planDiv);
        });
      })
      .catch(error => {
        console.error('Error al obtener planes:', error);
      });
  }
  
  
  
  function hideUpgradePanel() {
    document.getElementById('upgradePanel').style.display = 'none';
  }
  
  function subscribePlan(planId) {
    // Llamar a create_checkout_session para obtener la URL de Stripe
    const formData = new FormData();
    formData.append('plan_id', planId);
  
    fetch('/create_checkout_session/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCSRFToken(),  // tu función para obtener el token CSRF
      },
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.session_url) {
        // Redirigimos al checkout de Stripe
        window.location.href = data.session_url;
      } else {
        console.error('No se recibió la URL de la sesión:', data);
      }
    })
    .catch(error => {
      console.error('Error al suscribir:', error);
    });
  }
  


function confirmCancelPlan() {
  // Llamar al endpoint que cancela la suscripción en Stripe
  fetch('/cancel-subscription/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': getCSRFToken(),
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      console.error('Error al cancelar suscripción:', data.error);
      // Podrías mostrar un mensaje al usuario
    } else {
      console.log(data.message);
      // Ocultar el panel y recargar o redirigir
      hideCancelPanel();
      // Recargar la página para que desaparezca el plan:
      window.location.href = '/';
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

  


function showCancelPanel() {
    document.getElementById('cancelPanel').style.display = 'block';
  }
  
  function hideCancelPanel() {
    document.getElementById('cancelPanel').style.display = 'none';
  }
  
  function confirmCancelPlan() {
    // Llamar al endpoint que cancela la suscripción en Stripe
    fetch('/cancel-subscription/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCSRFToken(),
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error('Error al cancelar suscripción:', data.error);
        // Muestra mensaje de error si quiero
      } else {
        console.log(data.message);
        // Ocultar panel y recargar la página
        hideCancelPanel();
        window.location.href = '/';
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }
  
  