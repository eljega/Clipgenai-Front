document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(function (tab) {
        tab.addEventListener('shown.bs.tab', function (e) {
            var target = e.target.getAttribute("data-bs-target");

            if (target === '#generate-script') {
                document.getElementById('scriptSection').classList.add('d-none');
                document.getElementById('generatedScript').value = '';
                document.querySelector('button[onclick="generateScript()"]').style.display = 'block';
                document.getElementById('acceptScriptButton').style.display = 'none';
                document.getElementById('imagesSection').classList.add('d-none');
                document.querySelector('#generatedImages').innerHTML = '';
                document.getElementById('videoSection').classList.add('d-none');
                document.querySelector('#generatedVideo').src = '';
            } else {
                if (document.getElementById('scriptSection')) {
                    document.getElementById('scriptSection').classList.add('d-none');
                    document.getElementById('generatedScript').value = '';
                }

                if (document.getElementById('imagesSection')) {
                    document.getElementById('imagesSection').classList.add('d-none');
                    document.querySelector('#generatedImages').innerHTML = '';
                }

                if (document.getElementById('videoSection')) {
                    document.getElementById('videoSection').classList.add('d-none');
                    document.querySelector('#generatedVideo').src = '';
                }
            }

            if (target !== '#upload-script') {
                const uploadForm = document.getElementById('uploadForm');
                if (uploadForm) {
                    uploadForm.reset();
                }
            }

            if (target !== '#your-videos') {
                const videosList = document.getElementById('videosList');
                if (videosList) {
                    videosList.innerHTML = '';
                }
            }


        });
    });
});
