// floating-window.js
// Componente de ventana flotante y movible para resultados de consultas

class FloatingWindow {
  constructor(title, content, options = {}) {
    this.title = title;
    this.content = content;
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.xOffset = 0;
    this.yOffset = 0;
    this.zIndex = options.zIndex || 2500;
    this.width = options.width || '450px';
    this.maxHeight = options.maxHeight || '70vh';
    this.windowId = `floating-window-${Date.now()}`;
    this.onClose = options.onClose || null; // Callback al cerrar
  }

  create() {
    // Crear contenedor principal
    const windowDiv = document.createElement('div');
    windowDiv.id = this.windowId;
    windowDiv.style.cssText = `
      position: fixed;
      width: ${this.width};
      max-height: ${this.maxHeight};
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
      z-index: ${this.zIndex};
      overflow: hidden;
      display: flex;
      flex-direction: column;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    // Header (movible)
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    `;

    const titleSpan = document.createElement('h3');
    titleSpan.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
    `;
    titleSpan.textContent = this.title;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    `;
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.transform = 'scale(1.1)';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.transform = 'scale(1)';
    });
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(titleSpan);
    header.appendChild(closeBtn);

    // Content area (scrollable)
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      flex-grow: 1;
      color: #333;
      font-size: 13px;
      line-height: 1.6;
    `;
    contentDiv.innerHTML = this.content;

    // Footer with actions
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 12px 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 10px;
      background: #f9f9f9;
      flex-shrink: 0;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Limpiar';
    clearBtn.style.cssText = `
      flex: 1;
      padding: 10px 16px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
      transition: background 0.2s;
    `;
    clearBtn.addEventListener('mouseover', function() {
      this.style.background = '#c0392b';
    });
    clearBtn.addEventListener('mouseout', function() {
      this.style.background = '#e74c3c';
    });
    clearBtn.addEventListener('click', () => this.close());

    const closeBtn2 = document.createElement('button');
    closeBtn2.textContent = 'Cerrar';
    closeBtn2.style.cssText = `
      flex: 1;
      padding: 10px 16px;
      background: #95a5a6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
      transition: background 0.2s;
    `;
    closeBtn2.addEventListener('mouseover', function() {
      this.style.background = '#7f8c8d';
    });
    closeBtn2.addEventListener('mouseout', function() {
      this.style.background = '#95a5a6';
    });
    closeBtn2.addEventListener('click', () => this.close());

    footer.appendChild(clearBtn);
    footer.appendChild(closeBtn2);

    // Agregar todo al window
    windowDiv.appendChild(header);
    windowDiv.appendChild(contentDiv);
    windowDiv.appendChild(footer);

    // Agregar al DOM
    document.body.appendChild(windowDiv);

    // Hacer movible
    this.makeMovable(windowDiv, header);

    return windowDiv;
  }

  makeMovable(windowDiv, header) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    header.addEventListener('mousedown', (e) => {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;

      const onMouseMove = (e) => {
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        windowDiv.style.top = (windowDiv.offsetTop - pos2) + 'px';
        windowDiv.style.left = (windowDiv.offsetLeft - pos1) + 'px';
        windowDiv.style.transform = 'none'; // Remove centering when dragging
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  close() {
    const windowDiv = document.getElementById(this.windowId);
    if (windowDiv) {
      windowDiv.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        windowDiv.remove();
        // Ejecutar callback si existe
        if (this.onClose) {
          this.onClose();
        }
      }, 300);
    }
  }

  static show(title, content, options = {}) {
    // Agregar estilos de animación si no existen
    if (!document.getElementById('floating-window-styles')) {
      const style = document.createElement('style');
      style.id = 'floating-window-styles';
      style.textContent = `
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const fw = new FloatingWindow(title, content, options);
    return fw.create();
  }
}

console.log("✅ floating-window.js loaded");
