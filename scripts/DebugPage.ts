/**
 * 调试页面 - API测试工具
 * 创建时间：2026-03-28 10:45
 * 状态：待完成
 */

import { apiClient } from './ApiClient';

export interface ApiTestResult {
  api: string;
  method: string;
  status: 'pending' | 'success' | 'error';
  request?: any;
  response?: any;
  error?: string;
  timestamp: Date;
}

export class DebugPage {
  private testResults: ApiTestResult[] = [];
  private currentToken: string = '';
  private isRunning: boolean = false;

  /**
   * 初始化页面
   */
  initialize(): void {
    // 获取当前token
    this.currentToken = apiClient.getToken() || '';
    this.render();
  }

  /**
   * 设置Token
   */
  setToken(token: string): void {
    this.currentToken = token;
    if (token) {
      apiClient.setToken(token);
    }
    this.render();
  }

  /**
   * 运行所有API测试
   */
  async runAllTests(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.testResults = [];
    this.render();

    const tests: { api: string; method: string; params?: any }[] = [
      // 需要登录的接口先跳过
      // { api: '/auth/login', method: 'POST', params: { username: 'test', password: 'test123' } },
      // { api: '/auth/register', method: 'POST', params: { username: 'newuser', password: 'pass123' } },
    ];

    // 如果已登录，测试需要认证的接口
    if (this.currentToken) {
      tests.push(
        // 宠物相关 - 需要先有petId，这里跳过
        // { api: '/pets', method: 'POST', params: { name: '测试宠物' } },
        
        // 作业相关
        { api: '/homeworks/submit', method: 'POST', params: { subject: 'math', content: '测试作业' } },
        { api: '/homeworks/history', method: 'GET', params: {} },
      );
    }

    for (const test of tests) {
      await this.runSingleTest(test.api, test.method, test.params);
    }

    this.isRunning = false;
    this.render();
  }

  /**
   * 运行单个API测试
   */
  private async runSingleTest(api: string, method: string, params?: any): Promise<void> {
    const result: ApiTestResult = {
      api,
      method,
      status: 'pending',
      request: params,
      timestamp: new Date(),
    };

    this.testResults.push(result);
    this.render();

    try {
      let response: any;
      const fullApi = `/api/v1${api}`;
      
      // 构建fetch请求
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.currentToken ? { 'Authorization': `Bearer ${this.currentToken}` } : {}),
        },
      };

      if (params && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(params);
      }

      const url = method === 'GET' && params 
        ? `${fullApi}?${new URLSearchParams(params as any).toString()}`
        : fullApi;

      const fetchResponse = await fetch(url, options);
      const data = await fetchResponse.json();

      result.status = fetchResponse.ok ? 'success' : 'error';
      result.response = data;
    } catch (error: any) {
      result.status = 'error';
      result.error = error.message || '请求失败';
    }

    this.render();
  }

  /**
   * 手动测试单个接口
   */
  async testCustomApi(apiPath: string, method: string, bodyStr: string): Promise<void> {
    if (!apiPath) {
      alert('请输入API路径');
      return;
    }

    let body: any = undefined;
    if (bodyStr && (method === 'POST' || method === 'PATCH')) {
      try {
        body = JSON.parse(bodyStr);
      } catch {
        alert('请输入有效的JSON');
        return;
      }
    }

    await this.runSingleTest(apiPath, method, body);
  }

  /**
   * 清除测试结果
   */
  clearResults(): void {
    this.testResults = [];
    this.render();
  }

  /**
   * 复制结果到剪贴板
   */
  copyResults(): void {
    const text = JSON.stringify(this.testResults, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板');
    });
  }

  /**
   * 渲染页面
   */
  render(): void {
    const container = document.getElementById('debug-page');
    if (!container) {
      console.error('未找到调试页面容器');
      return;
    }

    container.innerHTML = `
      <div class="debug-container">
        <h2>🔧 API 调试工具</h2>
        
        <div class="token-section">
          <label>当前Token:</label>
          <input 
            type="text" 
            class="token-input"
            value="${this.currentToken}"
            onchange="debugPage.setToken(this.value)"
            placeholder="请输入JWT Token"
          />
          ${this.currentToken ? '<span class="token-status">✅ 已设置</span>' : '<span class="token-status warning">⚠️ 未设置</span>'}
        </div>

        <div class="manual-test-section">
          <h3>手动测试</h3>
          <div class="test-form">
            <input 
              type="text" 
              id="test-api-path" 
              placeholder="/auth/login"
              class="api-input"
            />
            <select id="test-method" class="method-select">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <textarea 
              id="test-body" 
              placeholder='{"key": "value"}'
              class="body-input"
            ></textarea>
            <button 
              class="test-btn"
              onclick="
                const path = document.getElementById('test-api-path').value;
                const method = document.getElementById('test-method').value;
                const body = document.getElementById('test-body').value;
                debugPage.testCustomApi(path, method, body);
              "
            >
              测试
            </button>
          </div>
        </div>

        <div class="quick-test-section">
          <h3>快速测试</h3>
          <div class="quick-buttons">
            <button class="quick-btn" onclick="debugPage.testCustomApi('/auth/login', 'POST', '{\"username\":\"test\",\"password\":\"test123\"}')">登录</button>
            <button class="quick-btn" onclick="debugPage.testCustomApi('/auth/register', 'POST', '{\"username\":\"user123\",\"password\":\"pass123\"}')">注册</button>
            <button 
              class="quick-btn" 
              ${!this.currentToken ? 'disabled' : ''}
              onclick="debugPage.testCustomApi('/homeworks/submit', 'POST', '{\"subject\":\"math\",\"content\":\"测试\"}')"
            >
              提交作业
            </button>
            <button 
              class="quick-btn" 
              ${!this.currentToken ? 'disabled' : ''}
              onclick="debugPage.testCustomApi('/homeworks/history', 'GET', '')"
            >
              作业历史
            </button>
          </div>
        </div>

        <div class="results-section">
          <div class="results-header">
            <h3>测试结果</h3>
            <div class="result-buttons">
              <button class="clear-btn" onclick="debugPage.clearResults()">清除</button>
              <button class="copy-btn" onclick="debugPage.copyResults()">复制</button>
            </div>
          </div>
          
          ${this.isRunning ? '<p class="running">测试运行中...</p>' : ''}
          
          <div class="results-list">
            ${this.renderResults()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染测试结果
   */
  private renderResults(): string {
    if (this.testResults.length === 0) {
      return '<p class="empty-tip">暂无测试结果，请点击上方按钮进行测试</p>';
    }

    return this.testResults.map((result, index) => `
      <div class="result-item ${result.status}">
        <div class="result-header">
          <span class="api-name">${result.method} ${result.api}</span>
          <span class="status-badge ${result.status}">${result.status === 'pending' ? '进行中' : result.status === 'success' ? '成功' : '失败'}</span>
        </div>
        <div class="result-details">
          ${result.request ? `<div class="request">请求: ${JSON.stringify(result.request)}</div>` : ''}
          ${result.response ? `<div class="response">响应: ${JSON.stringify(result.response)}</div>` : ''}
          ${result.error ? `<div class="error">错误: ${result.error}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
}

// 导出实例
export const debugPage = new DebugPage();