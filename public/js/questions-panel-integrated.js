// questions-panel-integrated.js
// Panel de preguntas INTEGRADO en el sidebar del mapa con botón toggle

class QuestionsPanelIntegrated {
  constructor() {
    this.questions = {};
    this.isOpen = false;
  }

  setQuestions(questions) {
    this.questions = questions;
  }

  /**
   * Renderiza el panel de preguntas como collapsible con botón toggle
   * @returns {string} HTML del panel listo para ser insertado en el sidebar
   */
  renderHTML() {
    let questionsHTML = '';
    
    if (Object.keys(this.questions).length > 0) {
      for (const [category, items] of Object.entries(this.questions)) {
        questionsHTML += `
          <details style="
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            overflow: hidden;
          ">
            <summary style="
              padding: 8px 12px;
              background-color: rgba(102, 126, 234, 0.25);
              cursor: pointer;
              font-weight: 500;
              color: #d0d0ff;
              user-select: none;
              transition: background-color 0.2s;
              font-size: 12px;
            ">${category}</summary>
            <div style="background: rgba(0, 0, 0, 0.2);">
              ${items.map(q => `
                <button class="question-btn-integrated" data-question="${q.text}" style="
                  display: block;
                  width: 100%;
                  padding: 8px 12px;
                  border: none;
                  background: transparent;
                  color: #bbb;
                  text-align: left;
                  cursor: pointer;
                  font-size: 11px;
                  transition: background-color 0.15s;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                  font-family: inherit;
                ">
                  ${q.emoji} ${q.text}
                </button>
              `).join('')}
            </div>
          </details>
        `;
      }
    }

    return `
      <div id="questions-panel-wrapper" style="
        background-color: transparent;
        border: none;
        padding: 0;
      ">
        <button id="btn-toggle-questions" style="
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%);
          border: 1px solid rgba(102, 126, 234, 0.6);
          border-radius: 6px;
          color: #7dd3fc;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: inherit;
        ">
          <span style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px;">❓</span>
            <span>Preguntas Frecuentes</span>
          </span>
          <span id="toggle-arrow" style="
            display: inline-block;
            transition: transform 0.3s ease;
            font-size: 16px;
          ">▼</span>
        </button>
        
        <div id="questions-panel-content" style="
          display: none;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-top: none;
          border-radius: 0 0 6px 6px;
          margin-top: -1px;
          padding: 12px;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        ">
          <div style="padding: 0;">
            ${questionsHTML}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attaches event listeners to toggle button and question buttons
   */
  attachEventListeners(handleQuestionFn) {
    const toggleBtn = document.getElementById('btn-toggle-questions');
    const panelContent = document.getElementById('questions-panel-content');
    const toggleArrow = document.getElementById('toggle-arrow');

    if (toggleBtn && panelContent) {
      // Toggle button click handler
      toggleBtn.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
          panelContent.style.display = 'block';
          // Animate height expand
          setTimeout(() => {
            panelContent.style.maxHeight = '500px';
            panelContent.style.padding = '12px';
          }, 10);
          toggleArrow.style.transform = 'rotate(180deg)';
          toggleBtn.style.borderBottomLeftRadius = '0';
          toggleBtn.style.borderBottomRightRadius = '0';
        } else {
          panelContent.style.maxHeight = '0';
          panelContent.style.padding = '0 12px';
          toggleArrow.style.transform = 'rotate(0deg)';
          toggleBtn.style.borderBottomLeftRadius = '6px';
          toggleBtn.style.borderBottomRightRadius = '6px';
          
          // Hide after animation
          setTimeout(() => {
            panelContent.style.display = 'none';
          }, 300);
        }
      });

      // Hover effects on toggle button
      toggleBtn.addEventListener('mouseover', function() {
        this.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.5) 0%, rgba(118, 75, 162, 0.5) 100%)';
        this.style.borderColor = 'rgba(102, 126, 234, 0.8)';
      });

      toggleBtn.addEventListener('mouseout', function() {
        this.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)';
        this.style.borderColor = 'rgba(102, 126, 234, 0.6)';
      });
    }

    // Question button click handlers
    const buttons = document.querySelectorAll('.question-btn-integrated');
    buttons.forEach(btn => {
      // Hover effect
      btn.addEventListener('mouseover', function() {
        this.style.backgroundColor = 'rgba(102, 126, 234, 0.3)';
      });

      btn.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'transparent';
      });

      // Click handler
      btn.addEventListener('click', (e) => {
        const question = btn.dataset.question;
        if (handleQuestionFn && typeof handleQuestionFn === 'function') {
          handleQuestionFn(question);
        }
      });
    });
  }

  handleQuestion(question) {
    console.log('📞 Consulta seleccionada:', question);
  }
}

// Global instance
let questionsPanelIntegrated = null;

/**
 * Inicializa el panel de preguntas integrado
 * @param {Object} questions - Objeto con categorías y preguntas
 * @param {Function} handleQuestionFn - Callback cuando se selecciona una pregunta
 */
function initQuestionsPanelIntegrated(questions, handleQuestionFn) {
  questionsPanelIntegrated = new QuestionsPanelIntegrated();
  questionsPanelIntegrated.setQuestions(questions);
  
  // El HTML se insertará en app.js dentro del sidebar
  // Los event listeners se attacharán cuando se renderice
  
  // Guardar la función de manejo para usarla después
  questionsPanelIntegrated.handleQuestionFn = handleQuestionFn;
  
  console.log('✅ Questions Panel Integrated inicializado');
}

console.log("✅ questions-panel-integrated.js loaded");

