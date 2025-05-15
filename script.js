// Signature Pad JavaScript
        document.addEventListener('DOMContentLoaded', function() {
            const canvas = document.getElementById('signature-pad');
            const ctx = canvas.getContext('2d');

            // --- State Variables (Declared Early) ---
            let history = [];
            let historyIndex = -1;
            
            let isDrawing = false;
            let lastActualPoint = { x: 0, y: 0 }; // Stores the actual last mouse/touch coordinate
            
            let currentColor = '#000000';
            let currentSize = 3;
            let currentOpacity = 1;
            let isEraser = false;

            // --- Canvas Setup ---
            function resizeCanvas() {
                const container = canvas.parentElement;
                const { offsetWidth, offsetHeight } = container;

                // Preserve drawing buffer if canvas exists and has dimensions
                let tempImageData = null;
                if (canvas.width > 0 && canvas.height > 0 && historyIndex >=0 && history.length > 0) {
                     // To avoid flicker or losing content if history isn't redrawn fast enough
                     // Or, more simply, rely on redrawSignature to handle it.
                }

                canvas.width = offsetWidth;
                canvas.height = offsetHeight;
                
                // After resizing, redraw the current signature
                redrawSignature();
            }

            // --- History Management ---
            function saveState() {
                if (canvas.width === 0 || canvas.height === 0) return; // Don't save if canvas isn't sized

                if (historyIndex < history.length - 1) {
                    history = history.slice(0, historyIndex + 1);
                }
                history.push(canvas.toDataURL());
                historyIndex++;
                
                if (history.length > 50) { // Limit history size
                    history.shift();
                    historyIndex--;
                }
                updateUndoRedoButtons();
            }

            function redrawSignature() {
                if (!canvas || !ctx) return;
                
                if (historyIndex >= 0 && historyIndex < history.length) {
                    const img = new Image();
                    img.onload = function() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        // Draw image, potentially scaled if canvas aspect ratio changed.
                        // For simplicity, draw at 0,0. If aspect ratio preservation is key,
                        // more complex logic for drawImage is needed.
                        ctx.drawImage(img, 0, 0); 
                    };
                    img.onerror = function() {
                        console.error("Error loading image from history for redraw. Clearing canvas.");
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    };
                    img.src = history[historyIndex];
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            
            function updateUndoRedoButtons() {
                document.getElementById('undo-btn').disabled = historyIndex <= 0;
                document.getElementById('redo-btn').disabled = historyIndex >= history.length - 1;
            }

            // --- Drawing Functions (Smoothed) ---
            function getPosition(e) {
                let x, y;
                const rect = canvas.getBoundingClientRect();
                if (e.type.includes('touch')) {
                    if (e.touches && e.touches.length > 0) {
                        x = e.touches[0].clientX - rect.left;
                        y = e.touches[0].clientY - rect.top;
                    } else { // Should not happen if event is touchstart/move with touches
                        return [lastActualPoint.x, lastActualPoint.y]; 
                    }
                } else {
                    x = e.offsetX;
                    y = e.offsetY;
                }
                return [x, y];
            }

            function startDrawing(e) {
                isDrawing = true;
                [lastActualPoint.x, lastActualPoint.y] = getPosition(e);

                // Set styles for the entire stroke (pen or eraser)
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.lineWidth = currentSize;

                if (isEraser) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)'; 
                    ctx.fillStyle = 'rgba(0,0,0,1)';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    const rgb = hexToRgb(currentColor);
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentOpacity})`;
                    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentOpacity})`;
                }

                // Draw initial dot (uses fillStyle set above)
                ctx.beginPath(); // Dot is its own path
                ctx.arc(lastActualPoint.x, lastActualPoint.y, currentSize / 2, 0, Math.PI * 2);
                ctx.fill();

                // Prepare for the line part of the stroke
                ctx.beginPath(); // Line is its own path, starting from the same point
                ctx.moveTo(lastActualPoint.x, lastActualPoint.y);
            }

            function draw(e) {
                if (!isDrawing) return;

                const [currentActualX, currentActualY] = getPosition(e);

                const midPointX = (lastActualPoint.x + currentActualX) / 2;
                const midPointY = (lastActualPoint.y + currentActualY) / 2;

                // Styles are already set in startDrawing and persist
                ctx.quadraticCurveTo(lastActualPoint.x, lastActualPoint.y, midPointX, midPointY);
                ctx.stroke(); 

                ctx.beginPath(); // Start new path segment from end of this curve
                ctx.moveTo(midPointX, midPointY);

                lastActualPoint = { x: currentActualX, y: currentActualY };
            }

            function stopDrawing() {
                if (isDrawing) {
                    // Draw final line segment to the actual last cursor position
                    ctx.lineTo(lastActualPoint.x, lastActualPoint.y);
                    ctx.stroke();
                    
                    isDrawing = false;
                    saveState();
                }
            }
            
            function hexToRgb(hex) {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return { r, g, b };
            }

            // --- Event Listeners ---
            // Drawing listeners
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing); // Stop if mouse leaves canvas

            // Touch listeners
            canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
            canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
            canvas.addEventListener('touchend', (e) => { /* e.preventDefault(); */ stopDrawing(); }); // No event needed for stopDrawing
            canvas.addEventListener('touchcancel', (e) => { /* e.preventDefault(); */ stopDrawing(); });


            // Button listeners
            document.getElementById('clear-btn').addEventListener('click', function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                saveState(); // Save the cleared state
            });

            document.getElementById('undo-btn').addEventListener('click', function() {
                if (historyIndex > 0) {
                    historyIndex--;
                    redrawSignature();
                    updateUndoRedoButtons();
                }
            });

            document.getElementById('redo-btn').addEventListener('click', function() {
                if (historyIndex < history.length - 1) {
                    historyIndex++;
                    redrawSignature();
                    updateUndoRedoButtons();
                }
            });

            // Tool selection
            const penBtn = document.getElementById('pen-btn');
            const eraserBtn = document.getElementById('eraser-btn');
            penBtn.addEventListener('click', function() {
                isEraser = false;
                canvas.classList.remove('eraser-cursor');
                canvas.classList.add('pen-cursor');
                penBtn.classList.add('bg-indigo-600', 'text-white');
                penBtn.classList.remove('hover:bg-gray-200');
                eraserBtn.classList.remove('bg-indigo-600', 'text-white');
                eraserBtn.classList.add('hover:bg-gray-200');
            });
            eraserBtn.addEventListener('click', function() {
                isEraser = true;
                canvas.classList.remove('pen-cursor');
                canvas.classList.add('eraser-cursor');
                eraserBtn.classList.add('bg-indigo-600', 'text-white');
                eraserBtn.classList.remove('hover:bg-gray-200');
                penBtn.classList.remove('bg-indigo-600', 'text-white');
                penBtn.classList.add('hover:bg-gray-200');
            });

            // Color selection
            document.querySelectorAll('[data-color]').forEach(button => {
                button.addEventListener('click', function() {
                    currentColor = this.getAttribute('data-color');
                    document.getElementById('custom-color').value = currentColor;
                });
            });
            document.getElementById('custom-color').addEventListener('input', function() {
                currentColor = this.value;
            });

            // Size selection
            document.getElementById('pen-size').addEventListener('input', function() {
                currentSize = this.value;
                document.getElementById('size-value').textContent = `${currentSize}px`;
            });

            // Opacity selection
            document.getElementById('pen-opacity').addEventListener('input', function() {
                currentOpacity = this.value / 100;
                document.getElementById('opacity-value').textContent = `${this.value}%`;
            });

            // Download functions
            document.getElementById('download-png').addEventListener('click', function() {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(canvas, 0, 0);
                
                const link = document.createElement('a');
                link.download = 'signature.png';
                link.href = tempCanvas.toDataURL('image/png');
                link.click();
            });
            document.getElementById('download-svg').addEventListener('click', function() {
                alert('SVG download functionality would require converting canvas drawing commands to SVG paths, which is complex and not implemented here.');
            });

            // Save to Library & Copy to Clipboard
            document.getElementById('save-signature').addEventListener('click', function() {
                const dataUrl = canvas.toDataURL();
                let signatures = JSON.parse(localStorage.getItem('signatures') || '[]');
                signatures.push(dataUrl);
                localStorage.setItem('signatures', JSON.stringify(signatures));
                updateSignatureLibrary();
                showToast('Signature saved to library!');
            });
            document.getElementById('copy-clipboard').addEventListener('click', function() {
                if (!navigator.clipboard || !navigator.clipboard.write) {
                    alert('Clipboard API not available or not permitted in this context (e.g. http).');
                    return;
                }
                canvas.toBlob(function(blob) {
                    if (!blob) {
                        showToast('Failed to create blob for clipboard.');
                        return;
                    }
                    navigator.clipboard.write([
                        new ClipboardItem({ [blob.type]: blob })
                    ]).then(function() {
                        showToast('Signature copied to clipboard!');
                    }).catch(function(err) {
                        console.error('Could not copy to clipboard:', err);
                        showToast('Failed to copy: ' + err.message);
                    });
                }, 'image/png');
            });

            // Signature Library
            function updateSignatureLibrary() {
                const libraryEl = document.getElementById('signature-library');
                const signatures = JSON.parse(localStorage.getItem('signatures') || '[]');
                
                if (signatures.length === 0) {
                    libraryEl.innerHTML = `
                        <div class="text-center text-gray-500 py-8 col-span-full">
                            <i class="fas fa-signature text-4xl mb-2"></i>
                            <p>Your saved signatures will appear here</p>
                        </div>`;
                    return;
                }
                libraryEl.innerHTML = '';
                signatures.forEach((sig, index) => {
                    const div = document.createElement('div');
                    div.className = 'bg-gray-100 rounded-lg p-2 flex flex-col items-center';
                    const img = document.createElement('img');
                    img.src = sig;
                    img.className = 'w-full h-24 object-contain mb-2 cursor-pointer';
                    img.title = 'Click to use this signature';
                    img.addEventListener('click', function() { loadSignatureFromDataUrl(sig); });

                    const btnGroup = document.createElement('div');
                    btnGroup.className = 'flex space-x-2 mt-1';
                    
                    const useBtn = document.createElement('button');
                    useBtn.className = 'px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700';
                    useBtn.innerHTML = '<i class="fas fa-pen mr-1"></i> Use';
                    useBtn.addEventListener('click', function() { loadSignatureFromDataUrl(sig); });
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700';
                    deleteBtn.innerHTML = '<i class="fas fa-trash mr-1"></i> Delete';
                    deleteBtn.addEventListener('click', function() {
                        signatures.splice(index, 1);
                        localStorage.setItem('signatures', JSON.stringify(signatures));
                        updateSignatureLibrary();
                        showToast('Signature deleted.');
                    });
                    
                    btnGroup.appendChild(useBtn);
                    btnGroup.appendChild(deleteBtn);
                    div.appendChild(img);
                    div.appendChild(btnGroup);
                    libraryEl.appendChild(div);
                });
            }

            function loadSignatureFromDataUrl(dataUrl) {
                const img = new Image();
                img.onload = function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    saveState(); // Save this loaded signature as the current state
                    showToast('Signature loaded onto canvas.');
                };
                img.src = dataUrl;
            }

            // Toast Notification
            function showToast(message) {
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2 animate-fadeIn';
                toast.style.animation = 'fadeIn 0.3s ease-out, fadeOut 0.3s ease-in 2.7s forwards';
                toast.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
                
                // CSS for fadeOut animation
                const style = document.createElement('style');
                style.innerHTML = `@keyframes fadeOut { to { opacity: 0; transform: translateY(10px); } }`;
                document.head.appendChild(style);

                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.remove();
                    style.remove();
                }, 3000);
            }

            // --- Initialization ---
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas(); // Initial resize and draw
            saveState();    // Save the initial blank state
            updateUndoRedoButtons();
            updateSignatureLibrary();
        });
