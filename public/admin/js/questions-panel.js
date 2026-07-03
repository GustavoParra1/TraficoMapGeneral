// js/questions-panel.js
// Panel reutilizable de PREGUNTAS/AYUDA - Simplificado y funcional

class QuestionsPanel {
  constructor() {
    this.questions = {};
    this.isOpen = false;
  }

  setQuestions(questions) {
    this.questions = questions;
  }

  render() {
    // Eliminar panel anterior si existe
    let oldPanel = document.getElementById('questions-panel');
    if (oldPanel) oldPanel.remove();
    let oldBtn = document.getElementById('btn-open-questions');
    if (oldBtn) oldBtn.remove();

    // Crear panel flotante
    const panel = document.createElement('div');
    panel.id = 'questions-panel';
    panel.style.cssText = `
      position: fixed;
      top: 90px;
      right: 25px;
      width: 420px;
      max-height: 70vh;
      background-color: #f8f9fa;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 1100;
      display: none;
      flex-direction: column;
      border: 1px solid #bae6fd;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      background-color: #e0f2f7;
      color: #1e293b;
      padding: 14px 16px;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #bae6fd;
      flex-shrink: 0;
    `;
    header.innerHTML = `<strong style="font-size: 15px; letter-spacing: 0.5px;">❓ PREGUNTAS FRECUENTES</strong>
      <button id="close-questions" style="
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #1e293b;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      ">×</button>`;

    // Content area with scrolling
    const content = document.createElement('div');
    content.id = 'questions-content';
    content.style.cssText = `
      padding: 12px;
      overflow-y: auto;
      flex-grow: 1;
    `;

    // Generate HTML from questions
    let questionsHTML = '';
    if (Object.keys(this.questions).length > 0) {
      for (const [category, items] of Object.entries(this.questions)) {
        questionsHTML += `
          <details style="
            margin-bottom: 12px;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            overflow: hidden;
          " open>
            <summary style="
              padding: 11px 13px;
              background-color: #e0f2f7;
              cursor: pointer;
              font-weight: 600;
              color: #1e293b;
              user-select: none;
              transition: background-color 0.2s;
            ">${category}</summary>
            <div style="background: white;">
              ${items.map(q => `
                <button class="question-btn" data-question="${q.text}" style="
                  display: block;
                  width: 100%;
                  padding: 11px 13px;
                  background-color: white;
                  color: #374151;
                  border: none;
                  border-bottom: 1px solid #e5e7eb;
                  font-size: 0.9rem;
                  text-align: left;
                  cursor: pointer;
                  transition: background-color 0.15s;
                ">${q.emoji} ${q.text}</button>
              `).join('')}
            </div>
          </details>
        `;
      }
    } else {
      questionsHTML = '<div style="padding: 10px; color: #999; text-align: center;">No hay preguntas disponibles</div>';
    }

    content.innerHTML = questionsHTML;

    panel.appendChild(header);
    panel.appendChild(content);
    document.body.appendChild(panel);

    // Create floating button
    this.createButtonIfNotExists();

    // Attach events
    this.attachEvents();
  }

  createButtonIfNotExists() {
    if (document.getElementById('btn-open-questions')) return;

    const button = document.createElement('button');
    button.id = 'btn-open-questions';
    button.style.cssText = `
      position: fixed;
      top: 100px;
      right: 25px;
      z-index: 1099;
      width: 50px;
      height: 50px;
      padding: 0;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      border: none;
      border-radius: 50%;
      font-weight: 600;
      font-size: 24px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    button.innerHTML = '❓';
    button.title = 'Preguntas Frecuentes';

    button.addEventListener('mouseover', function() {
      this.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.5)';
    });

    button.addEventListener('mouseout', function() {
      this.style.background = 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)';
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.4)';
    });

    button.addEventListener('click', () => this.toggle());

    document.body.appendChild(button);
  }

  attachEvents() {
    const panel = document.getElementById('questions-panel');
    const closeBtn = document.getElementById('close-questions');
    const questionBtns = document.querySelectorAll('.question-btn');

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Question buttons
    questionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const question = e.currentTarget.getAttribute('data-question');
        this.handleQuestion(question);
        this.close();
      });

      btn.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#f3f4f6';
      });

      btn.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'white';
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (panel && this.isOpen && !panel.contains(e.target) && 
          e.target.id !== 'btn-open-questions' && 
          !e.target.closest('#btn-open-questions')) {
        this.close();
      }
    }, { passive: true });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    const panel = document.getElementById('questions-panel');
    if (panel) {
      panel.style.display = 'flex';
      this.isOpen = true;
    }
  }

  close() {
    const panel = document.getElementById('questions-panel');
    if (panel) {
      panel.style.display = 'none';
      this.isOpen = false;
    }
  }

  handleQuestion(question) {
    console.log('📞 Consulta seleccionada:', question);
  }
}

// Global instance
let questionsPanel = null;

function initQuestionsPanel(questions) {
  questionsPanel = new QuestionsPanel();
  questionsPanel.setQuestions(questions);
  questionsPanel.render();
}
