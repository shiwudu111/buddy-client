/**
 * 作业提交页面
 * 创建时间：2026-03-28 10:30
 * 状态：待完成
 */

import { apiClient, ApiResponse } from './ApiClient';

export interface HomeworkFormData {
  subject: 'chinese' | 'math' | 'english';
  content: string;
  imageUrl?: string;
}

export class HomeworkPage {
  private formData: HomeworkFormData = {
    subject: 'math',
    content: '',
    imageUrl: undefined,
  };
  
  private isLoading: boolean = false;
  private errorMessage: string = '';
  private successMessage: string = '';
  private homeworkList: any[] = [];
  private isLoadingHistory: boolean = false;

  /**
   * 初始化页面
   */
  async initialize(): Promise<void> {
    if (!apiClient.isLoggedIn()) {
      this.showMessage('请先登录', 'error');
      return;
    }
    
    await this.loadHomeworkHistory();
    this.render();
  }

  /**
   * 处理表单输入
   */
  handleInput(field: keyof HomeworkFormData, value: any): void {
    if (field === 'subject') {
      this.formData.subject = value;
    } else {
      (this.formData[field as keyof HomeworkFormData] as string) = value;
    }
    this.render();
  }

  /**
   * 验证表单
   */
  private validateForm(): boolean {
    if (!this.formData.content.trim()) {
      this.errorMessage = '请输入作业内容';
      return false;
    }
    if (this.formData.content.length > 1000) {
      this.errorMessage = '作业内容不能超过1000字';
      return false;
    }
    return true;
  }

  /**
   * 提交作业
   */
  async submitHomework(): Promise<void> {
    if (!this.validateForm()) {
      this.render();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.render();

    try {
      const result = await apiClient.submitHomework({
        subject: this.formData.subject,
        content: this.formData.content,
      });

      if (result.success) {
        this.successMessage = '作业提交成功！' + (result.data?.expReward ? ` 获得 ${result.data.expReward} 经验值` : '');
        // 清空表单
        this.formData.content = '';
        // 刷新历史记录
        await this.loadHomeworkHistory();
      } else {
        this.errorMessage = result.message || '提交失败';
      }
    } catch (error) {
      this.errorMessage = '网络请求失败，请检查网络连接';
      console.error('提交作业错误:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * 加载作业历史
   */
  private async loadHomeworkHistory(): Promise<void> {
    this.isLoadingHistory = true;
    this.render();

    try {
      const result = await apiClient.getHomeworkHistory({ limit: 10 });
      if (result.success && result.data) {
        // 根据后端返回格式获取列表
        this.homeworkList = result.data.list || result.data || [];
      }
    } catch (error) {
      console.error('加载作业历史错误:', error);
    } finally {
      this.isLoadingHistory = false;
      this.render();
    }
  }

  /**
   * 显示消息
   */
  private showMessage(message: string, type: 'success' | 'error' = 'error'): void {
    if (type === 'error') {
      this.errorMessage = message;
    } else {
      this.successMessage = message;
    }
    this.render();
  }

  /**
   * 渲染页面
   */
  render(): void {
    const container = document.getElementById('homework-page');
    if (!container) {
      console.error('未找到作业页面容器');
      return;
    }

    // 科目选项
    const subjects = [
      { value: 'chinese', label: '语文' },
      { value: 'math', label: '数学' },
      { value: 'english', label: '英语' },
    ];

    container.innerHTML = `
      <div class="homework-container">
        <h2>📚 提交作业</h2>
        
        ${this.errorMessage ? `<div class="error-message">${this.errorMessage}</div>` : ''}
        ${this.successMessage ? `<div class="success-message">${this.successMessage}</div>` : ''}
        
        <div class="form-section">
          <div class="form-group">
            <label>选择科目</label>
            <div class="subject-buttons">
              ${subjects.map(s => `
                <button 
                  class="subject-btn ${this.formData.subject === s.value ? 'active' : ''}"
                  onclick="homeworkPage.handleInput('subject', '${s.value}')"
                >
                  ${s.label}
                </button>
              `).join('')}
            </div>
          </div>
          
          <div class="form-group">
            <label>作业内容</label>
            <textarea
              class="content-input"
              placeholder="请输入作业内容..."
              value="${this.formData.content}"
              oninput="homeworkPage.handleInput('content', this.value)"
              ${this.isLoading ? 'disabled' : ''}
            >${this.formData.content}</textarea>
          </div>
          
          <button 
            class="submit-btn"
            onclick="homeworkPage.submitHomework()"
            ${this.isLoading ? 'disabled' : ''}
          >
            ${this.isLoading ? '提交中...' : '提交作业'}
          </button>
        </div>
        
        <div class="history-section">
          <h3>历史提交</h3>
          ${this.isLoadingHistory ? '<p class="loading">加载中...</p>' : this.renderHistoryList()}
        </div>
      </div>
    `;
  }

  /**
   * 渲染历史记录列表
   */
  private renderHistoryList(): string {
    if (!this.homeworkList || this.homeworkList.length === 0) {
      return '<p class="empty-tip">暂无作业记录</p>';
    }

    return `
      <div class="homework-list">
        ${this.homeworkList.map(h => `
          <div class="homework-item">
            <div class="homework-header">
              <span class="subject-tag">${this.getSubjectLabel(h.subject)}</span>
              <span class="submit-time">${this.formatDate(h.submittedAt)}</span>
            </div>
            <div class="homework-content">${h.content}</div>
            ${h.score !== undefined ? `
              <div class="homework-result">
                <span class="score">评分: ${h.score}分</span>
                ${h.feedback ? `<span class="feedback">${h.feedback}</span>` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 获取科目标签
   */
  private getSubjectLabel(subject: string): string {
    const labels: Record<string, string> = {
      'CHINESE': '语文',
      'chinese': '语文',
      'MATH': '数学',
      'math': '数学',
      'ENGLISH': '英语',
      'english': '英语',
    };
    return labels[subject] || subject;
  }

  /**
   * 格式化日期
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

// 导出实例
export const homeworkPage = new HomeworkPage();