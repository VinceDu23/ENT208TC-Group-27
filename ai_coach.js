/* ============================================
   ai_coach.js — AI 健身教练咨询模块
   调用 OpenAI 兼容 Chat Completions API
   ============================================ */

const DEFAULT_SYSTEM_PROMPT = `你是一位专业的健身教练和运动科学专家。你有以下能力：
1. 为用户的力量训练提供动作纠正建议（深蹲、卧推、硬拉、肩推等）
2. 制定个性化训练计划和周期化方案
3. 解答营养、增肌、减脂相关问题
4. 分析训练数据并提供改进方向

回答要求：专业但通俗易懂，给出具体可执行的建议，必要时引用运动科学原理。`;

const AI_SETTINGS_KEY = 'fitvision_ai_settings';
const AI_CHAT_KEY = 'fitvision_ai_chat_history';

class AICoachModule {
  constructor() {
    this.settings = this._loadSettings();
    this.chatHistory = this._loadChatHistory();
    this.isGenerating = false;
    this.abortController = null;
  }

  _loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY));
      return {
        endpoint: saved?.endpoint || 'https://api.deepseek.com/v1/chat/completions',
        apiKey: saved?.apiKey || '',
        model: saved?.model || 'deepseek-chat',
        temperature: saved?.temperature ?? 0.7,
        maxTokens: saved?.maxTokens || 1024,
        systemPrompt: saved?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        useContext: saved?.useContext ?? true
      };
    } catch (e) {
      return {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        apiKey: '', model: 'deepseek-chat',
        temperature: 0.7, maxTokens: 1024,
        systemPrompt: DEFAULT_SYSTEM_PROMPT, useContext: true
      };
    }
  }

  _saveSettings() {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(this.settings));
  }

  _loadChatHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(AI_CHAT_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (e) { return []; }
  }

  _saveChatHistory() {
    // Only persist last 50 messages to avoid LocalStorage bloat
    const trimmed = this.chatHistory.slice(-50);
    try { localStorage.setItem(AI_CHAT_KEY, JSON.stringify(trimmed)); } catch (e) {}
  }

  init() {
    // Populate settings inputs
    document.getElementById('aiEndpoint').value = this.settings.endpoint;
    document.getElementById('aiApiKey').value = this.settings.apiKey;
    document.getElementById('aiModel').value = this.settings.model;
    document.getElementById('aiTemperature').value = this.settings.temperature;
    document.getElementById('temperatureVal').textContent = this.settings.temperature;
    document.getElementById('aiMaxTokens').value = this.settings.maxTokens;
    document.getElementById('aiSystemPrompt').value = this.settings.systemPrompt;

    this._bindUI();
    this._renderMessages();
  }

  _bindUI() {
    // Temperature slider
    const tempSlider = document.getElementById('aiTemperature');
    if (tempSlider) {
      tempSlider.addEventListener('input', () => {
        document.getElementById('temperatureVal').textContent = parseFloat(tempSlider.value).toFixed(1);
      });
    }

    // Toggle config panel
    const btnToggle = document.getElementById('btnToggleConfig');
    const configPanel = document.getElementById('aicoachConfigPanel');
    const layout = document.querySelector('.aicoach-layout');
    if (btnToggle && configPanel && layout) {
      btnToggle.addEventListener('click', () => {
        const isHidden = configPanel.style.display === 'none';
        configPanel.style.display = isHidden ? '' : 'none';
        layout.classList.toggle('config-hidden', !isHidden);
        btnToggle.style.borderColor = isHidden ? 'var(--accent)' : 'rgba(0,255,136,0.25)';
        btnToggle.style.background = isHidden ? 'rgba(0,255,136,0.1)' : '';
      });
      // Start hidden
      layout.classList.add('config-hidden');
    }

    // Toggle API key visibility
    document.getElementById('toggleApiKey').addEventListener('click', () => {
      const input = document.getElementById('aiApiKey');
      const btn = document.getElementById('toggleApiKey');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    });

    // Save config
    document.getElementById('btnSaveAIConfig').addEventListener('click', () => this._saveConfig());

    // Test connection
    document.getElementById('btnTestAIConn').addEventListener('click', () => this._testConnection());

    // Reset prompt
    document.getElementById('btnResetPrompt').addEventListener('click', () => {
      document.getElementById('aiSystemPrompt').value = DEFAULT_SYSTEM_PROMPT;
      this.settings.systemPrompt = DEFAULT_SYSTEM_PROMPT;
      this._saveSettings();
      this._setStatus('prompt_reset', 'success');
    });

    // Inject training context
    document.getElementById('btnInjectContext').addEventListener('click', () => this._injectContext());

    // Send message
    document.getElementById('btnSendChat').addEventListener('click', () => this._handleSend());
    const input = document.getElementById('aicoachInput');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });
    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Clear chat
    document.getElementById('btnClearChat').addEventListener('click', () => {
      if (confirm('确定清除所有对话记录？')) {
        this.chatHistory = [];
        this._saveChatHistory();
        this._renderMessages();
      }
    });

    // Export chat
    document.getElementById('btnExportChat').addEventListener('click', () => this._exportChat());

    // Quick prompts
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('aicoachInput').value = btn.dataset.prompt;
        this._handleSend();
      });
    });
  }

  _saveConfig() {
    this.settings.endpoint = document.getElementById('aiEndpoint').value.trim();
    this.settings.apiKey = document.getElementById('aiApiKey').value.trim();
    this.settings.model = document.getElementById('aiModel').value.trim();
    this.settings.temperature = parseFloat(document.getElementById('aiTemperature').value);
    this.settings.maxTokens = parseInt(document.getElementById('aiMaxTokens').value) || 1024;
    this.settings.systemPrompt = document.getElementById('aiSystemPrompt').value;
    this._saveSettings();
    this._setStatus('config_saved', 'success');
  }

  _setStatus(msg, type) {
    const el = document.getElementById('aiConnStatus');
    if (!el) return;
    el.textContent = type === 'success' ? `✓ ${msg}` : `✕ ${msg}`;
    el.style.color = type === 'success' ? 'var(--accent)' : 'var(--danger)';
    el.style.background = type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)';
    el.style.padding = '4px 10px';
    el.style.borderRadius = '6px';
    setTimeout(() => { el.textContent = ''; el.style.padding = ''; el.style.background = ''; }, 4000);
  }

  async _testConnection() {
    this._saveConfig();
    const status = document.getElementById('aiConnStatus');
    if (!this.settings.apiKey) {
      this._setStatus('请输入 API Key', 'error');
      return;
    }
    if (status) status.textContent = '... 测试中';
    try {
      const resp = await fetch(this.settings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages: [
            { role: 'system', content: 'Reply with only: OK' },
            { role: 'user', content: 'ping' }
          ],
          max_tokens: 5,
          temperature: 0
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (resp.ok) {
        this._setStatus('连接成功', 'success');
      } else {
        const errData = await resp.json().catch(() => ({}));
        this._setStatus(`错误 ${resp.status}: ${errData.error?.message || resp.statusText}`, 'error');
      }
    } catch (e) {
      this._setStatus(`连接失败: ${e.message}`, 'error');
    }
  }

  _injectContext() {
    if (!window.__app || !window.__app.dashboard) {
      this._setStatus('无训练数据', 'error');
      return;
    }
    const dash = window.__app.dashboard;
    const metrics = dash.source.getMetrics();
    const hrData = dash.source.getHeartRateData();
    const exercise = dash.exercise;
    const exerciseNames = { squat: '深蹲', bench: '卧推', deadlift: '硬拉', ohp: '肩推' };

    const ctx = `[用户当前训练数据]
动作: ${exerciseNames[exercise] || exercise}
髋角: ${metrics.hip}°  膝角: ${metrics.knee}°  躯干角: ${metrics.trunk}°
肩角: ${metrics.shoulder}°  动作速度: ${metrics.speed} m/s  杠铃偏移: ${metrics.deviation} cm
姿势评分: ${metrics.posture} 分  心率: ${hrData.current} bpm`;

    this.chatHistory.push({ role: 'system', content: ctx });
    this._saveChatHistory();
    this._renderMessages();
    this._setStatus('已注入训练上下文（仅本次对话）', 'success');
  }

  async _handleSend() {
    if (this.isGenerating) return;
    const input = document.getElementById('aicoachInput');
    const text = input.value.trim();
    if (!text) return;

    // Ensure config is saved
    if (!this.settings.apiKey) {
      this._saveConfig();
      if (!this.settings.apiKey) {
        this._setStatus('请先配置 API Key', 'error');
        return;
      }
    }

    input.value = '';
    input.style.height = 'auto';

    // Add user message
    this.chatHistory.push({ role: 'user', content: text });

    // Build messages array (system prompt + context + history)
    const messages = [
      { role: 'system', content: this.settings.systemPrompt }
    ];
    // Add any injected context messages
    for (const msg of this.chatHistory) {
      messages.push(msg);
    }

    this._renderMessages();

    // Show typing indicator
    document.getElementById('aicoachTyping').style.display = 'flex';
    this._scrollToBottom();

    this.isGenerating = true;
    this.abortController = new AbortController();

    let fullResponse = '';
    try {
      const resp = await fetch(this.settings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages: messages,
          temperature: this.settings.temperature,
          max_tokens: this.settings.maxTokens,
          stream: false
        }),
        signal: this.abortController.signal
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(`${resp.status}: ${errData.error?.message || resp.statusText}`);
      }

      const data = await resp.json();
      fullResponse = data.choices?.[0]?.message?.content || '(无响应)';
    } catch (e) {
      if (e.name === 'AbortError') {
        fullResponse = '⏹ 生成已中止';
      } else {
        fullResponse = `❌ 请求失败: ${e.message}`;
      }
    }

    document.getElementById('aicoachTyping').style.display = 'none';
    this.chatHistory.push({ role: 'assistant', content: fullResponse });
    this._saveChatHistory();
    this._renderMessages();
    this._scrollToBottom();

    this.isGenerating = false;
    this.abortController = null;
  }

  _renderMessages() {
    const container = document.getElementById('aicoachMessages');
    if (!container) return;

    // Filter out context system messages for display
    const displayMsgs = this.chatHistory.filter(m => {
      return !(m.role === 'system' && m.content.startsWith('[用户当前训练数据]'));
    });

    if (displayMsgs.length === 0) {
      // Restore welcome screen
      container.innerHTML = `
        <div class="aicoach-welcome">
          <div class="welcome-avatar">🧠</div>
          <h3 data-i18n="aicoach.welcome_title">你好，我是你的 AI 健身教练</h3>
          <p data-i18n="aicoach.welcome_text">我可以帮你分析训练数据、制定计划、解答动作疑问。配置 API 后即可开始对话。</p>
          <div class="quick-prompts" id="quickPrompts">
            <span class="quick-prompt-label" data-i18n="aicoach.quick">快捷提问：</span>
            <button class="quick-btn" data-prompt="我的深蹲膝盖内扣怎么纠正？">🦵 深蹲膝盖内扣</button>
            <button class="quick-btn" data-prompt="帮我制定一个3天分化训练计划">📅 训练计划</button>
            <button class="quick-btn" data-prompt="硬拉时腰背弯曲是什么原因？如何改善？">🔩 硬拉腰痛</button>
            <button class="quick-btn" data-prompt="减脂期应该如何安排有氧和力量的配比？">🔥 减脂配比</button>
            <button class="quick-btn" data-prompt="增肌期蛋白质摄入建议是多少？">🥩 蛋白摄入</button>
            <button class="quick-btn" data-prompt="如何提升卧推的最大重量？">💪 提升卧推</button>
          </div>
        </div>`;
      // Re-bind quick buttons
      document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('aicoachInput').value = btn.dataset.prompt;
          this._handleSend();
        });
      });
    } else {
      container.innerHTML = displayMsgs.map(m => {
        const isUser = m.role === 'user';
        return `
          <div class="chat-msg ${isUser ? 'msg-user' : 'msg-ai'}">
            <div class="msg-avatar">${isUser ? '👤' : '🧠'}</div>
            <div class="msg-bubble">
              <div class="msg-role">${isUser ? 'You' : 'AI Coach'}</div>
              <div class="msg-content">${this._formatContent(m.content)}</div>
            </div>
          </div>`;
      }).join('');
    }
  }

  _formatContent(text) {
    // Simple markdown-like formatting
    let formatted = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    return formatted;
  }

  _scrollToBottom() {
    const container = document.getElementById('aicoachMessages');
    if (container) {
      setTimeout(() => container.scrollTop = container.scrollHeight, 50);
    }
  }

  _exportChat() {
    const displayMsgs = this.chatHistory.filter(m => {
      return !(m.role === 'system' && m.content.startsWith('[用户当前训练数据]'));
    });
    if (displayMsgs.length === 0) {
      this._setStatus('无对话可导出', 'error');
      return;
    }
    const text = displayMsgs.map(m => {
      const role = m.role === 'user' ? 'You' : 'AI Coach';
      return `[${role}]\n${m.content}\n`;
    }).join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FitVision_Chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this._setStatus('导出成功', 'success');
  }
}
