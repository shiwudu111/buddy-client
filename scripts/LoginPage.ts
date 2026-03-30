/**
 * 登录页面组件
 * 创建时间：2026-03-27 18:10
 */

import { apiClient, ApiResponse } from './ApiClient';

export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData extends LoginFormData {
  email?: string;
  phone?: string;
  grade?: string;
  role?: 'student' | 'parent';
  confirmPassword: string;
}

export class LoginPage {
  private isLoginMode: boolean = true;
  private errorMessage: string = '';
  private isLoading: boolean = false;

  // 表单数据
  private loginData: LoginFormData = {
    username: '',
    password: '',
  };

  private registerData: RegisterFormData = {
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    grade: '',
    role: 'student',
  };

  /**
   * 切换登录/注册模式
   */
  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.render();
  }

  /**
   * 处理登录表单输入
   */
  handleLoginInput(field: keyof LoginFormData, value: string): void {
    this.loginData[field] = value;
    this.render();
  }

  /**
   * 处理注册表单输入
   */
  handleRegisterInput(field: keyof RegisterFormData, value: string): void {
    (this.registerData[field] as string) = value;
    this.render();
  }

  /**
   * 验证登录表单
   */
  private validateLoginForm(): boolean {
    const { username, password } = this.loginData;
    
    if (!username.trim()) {
      this.errorMessage = '请输入用户名';
      return false;
    }

    if (!password.trim()) {
      this.errorMessage = '请输入密码';
      return false;
    }

    if (password.length < 6) {
      this.errorMessage = '密码长度至少6位';
      return false;
    }

    return true;
  }

  /**
   * 验证注册表单
   */
  private validateRegisterForm(): boolean {
    const { username, password, confirmPassword, email, phone } = this.registerData;
    
    if (!username.trim()) {
      this.errorMessage = '请输入用户名';
      return false;
    }

    if (username.length < 3) {
      this.errorMessage = '用户名长度至少3位';
      return false;
    }

    if (!password.trim()) {
      this.errorMessage = '请输入密码';
      return false;
    }

    if (password.length < 6) {
      this.errorMessage = '密码长度至少6位';
      return false;
    }

    if (password !== confirmPassword) {
      this.errorMessage = '两次输入的密码不一致';
      return false;
    }

    // 邮箱验证（可选）
    if (email && !this.isValidEmail(email)) {
      this.errorMessage = '请输入有效的邮箱地址';
      return false;
    }

    // 手机号验证（可选）
    if (phone && !this.isValidPhone(phone)) {
      this.errorMessage = '请输入有效的手机号';
      return false;
    }

    return true;
  }

  /**
   * 邮箱验证
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 手机号验证
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 处理登录
   */
  async handleLogin(): Promise<void> {
    if (!this.validateLoginForm()) {
      this.render();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.render();

    try {
      const result = await apiClient.login(this.loginData);
      
      if (result.success) {
        this.errorMessage = '';
        this.onLoginSuccess(result.data);
      } else {
        this.errorMessage = result.message || '登录失败';
      }
    } catch (error) {
      this.errorMessage = '网络请求失败，请检查网络连接';
      console.error('登录错误:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * 处理注册
   */
  async handleRegister(): Promise<void> {
    if (!this.validateRegisterForm()) {
      this.render();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.render();

    try {
      // 准备注册数据
      const registerData = {
        username: this.registerData.username,
        password: this.registerData.password,
        email: this.registerData.email || undefined,
        phone: this.registerData.phone || undefined,
        grade: this.registerData.grade || undefined,
        role: this.registerData.role || 'student',
      };

      const result = await apiClient.register(registerData);
      
      if (result.success) {
        this.errorMessage = '';
        this.onRegisterSuccess(result.data);
      } else {
        this.errorMessage = result.message || '注册失败';
      }
    } catch (error) {
      this.errorMessage = '网络请求失败，请检查网络连接';
      console.error('注册错误:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * 登录成功回调
   */
  private onLoginSuccess(data: any): void {
    console.log('登录成功:', data);
    // 这里应该跳转到主页面
    // window.location.href = '/main';
    alert('登录成功！即将跳转到主页面...');
  }

  /**
   * 注册成功回调
   */
  private onRegisterSuccess(data: any): void {
    console.log('注册成功:', data);
    // 注册成功后自动登录
    apiClient.setToken(data.token);
    alert('注册成功！已自动登录，即将跳转到主页面...');
    // 这里应该跳转到主页面
    // window.location.href = '/main';
  }

  /**
   * 渲染页面
   * 注意：这是一个简化的渲染方法，实际在Cocos Creator中应该使用组件系统
   */
  render(): string {
    if (this.isLoginMode) {
      return this.renderLoginForm();
    } else {
      return this.renderRegisterForm();
    }
  }

  /**
   * 渲染登录表单
   */
  private renderLoginForm(): string {
    return `
      <div class="login-container">
        <h2>学伴精灵 - 登录</h2>
        
        ${this.errorMessage ? `
          <div class="error-message">
            ${this.errorMessage}
          </div>
        ` : ''}
        
        <div class="form-group">
          <label>用户名</label>
          <input 
            type="text" 
            value="${this.loginData.username}"
            oninput="loginPage.handleLoginInput('username', this.value)"
            placeholder="请输入用户名"
            ${this.isLoading ? 'disabled' : ''}
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            type="password" 
            value="${this.loginData.password}"
            oninput="loginPage.handleLoginInput('password', this.value)"
            placeholder="请输入密码"
            ${this.isLoading ? 'disabled' : ''}
          />
        </div>
        
        <button 
          class="submit-btn"
          onclick="loginPage.handleLogin()"
          ${this.isLoading ? 'disabled' : ''}
        >
          ${this.isLoading ? '登录中...' : '登录'}
        </button>
        
        <div class="switch-mode">
          还没有账号？
          <a href="#" onclick="loginPage.toggleMode()">立即注册</a>
        </div>
      </div>
    `;
  }

  /**
   * 渲染注册表单
   */
  private renderRegisterForm(): string {
    return `
      <div class="register-container">
        <h2>学伴精灵 - 注册</h2>
        
        ${this.errorMessage ? `
          <div class="error-message">
            ${this.errorMessage}
          </div>
        ` : ''}
        
        <div class="form-group">
          <label>用户名 *</label>
          <input 
            type="text" 
            value="${this.registerData.username}"
            oninput="loginPage.handleRegisterInput('username', this.value)"
            placeholder="请输入用户名（至少3位）"
            ${this.isLoading ? 'disabled' : ''}
          />
        </div>
        
        <div class="form-group">
          <label>密码 *</label>
          <input 
            type="password" 
            value="${this.registerData.password}"
            oninput="loginPage.handleRegisterInput('password', this.value)"
            placeholder="请输入密码（至少6位）"
            ${this.isLoading ? 'disabled' : ''}
          />
        </div>
        
        <div class="form-group">
          <label>确认密码 *</label>
          <input 
            type="password" 
            value="${this.registerData.confirmPassword}"
            oninput="loginPage.handleRegisterInput('confirmPassword', this.value)"
            placeholder="请再次输入密码"
            ${this.isLoading ? 'disabled' : ''}
          />
        </div>
        
        <div class="form-group">
          <label>邮箱（可选）</label>
          <input 
            type="email" 
            value="${this.registerData.email}"
            oninput="loginPage.handleRegisterInput('email', this.value)"
            placeholder="请输入邮箱"
            ${this.isLoading ? 'disabled' : ''}
          />
        </div>
        
        <div class="form-group">
          <label>手机号（可选）</label>
          <input 
            type="tel" 
            value="${this.registerData.phone}"
            oninput="loginPage.handleRegisterInput('phone', this.value)"
            placeholder="请输入手机号"
            ${this.isLoading ? 'disabled' : ''}
          />
        </div>
        
        <div class="form-group">
          <label>年级（可选）</label>
          <select 
            value="${this.registerData.grade}"
            onchange="loginPage.handleRegisterInput('grade', this.value)"
            ${this.isLoading ? 'disabled' : ''}
          >
            <option value="">请选择年级</option>
            <option value="grade1">一年级</option>
            <option value="grade2">二年级</option>
            <option value="grade3">三年级</option>
            <option value="grade4">四年级</option>
            <option value="grade5">五年级</option>
            <option value="grade6">六年级</option>
            <option value="middle1">初一</option>
            <option value="middle2">初二</option>
            <option value="middle3">初三</option>
            <option value="high1">高一</option>
            <option value="high2">高二</option>
            <option value="high3">高三</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>角色 *</label>
          <select 
            value="${this.registerData.role || 'student'}"
            onchange="loginPage.handleRegisterInput('role', this.value)"
            ${this.isLoading ? 'disabled' : ''}
          >
            <option value="student">学生</option>
            <option value="parent">家长</option>
          </select>
        </div>
        
        <button 
          class="submit-btn"
          onclick="loginPage.handleRegister()"
          ${this.isLoading ? 'disabled' : ''}
        >
          ${this.isLoading ? '注册中...' : '注册'}
        </button>
        
        <div class="switch-mode">
          已有账号？
          <a href="#" onclick="loginPage.toggleMode()">立即登录</a>
        </div>
      </div>
    `;
  }

  /**
   * 获取当前模式
   */
  getMode(): string {
    return this.isLoginMode ? 'login' : 'register';
  }

  /**
   * 获取错误信息
   */
  getErrorMessage(): string {
    return this.errorMessage;
  }

  /**
   * 获取加载状态
   */
  getLoadingStatus(): boolean {
    return this.isLoading;
  }
}

// 创建全局实例（简化示例）
export const loginPage = new LoginPage();