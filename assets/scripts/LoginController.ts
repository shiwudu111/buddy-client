import { _decorator, Component, Node, EditBox, Button, Label, Sprite, Color } from 'cc';
import { apiClient, LoginRequest, RegisterRequest } from './ApiClient';

const { ccclass, property } = _decorator;

/**
 * 登录页面控制器
 * 处理用户登录和注册功能
 */
@ccclass('LoginController')
export class LoginController extends Component {
  
  @property(EditBox)
  private usernameInput: EditBox = null!;
  
  @property(EditBox)
  private passwordInput: EditBox = null!;
  
  @property(EditBox)
  private emailInput: EditBox = null!;
  
  @property(Node)
  private loginPanel: Node = null!;
  
  @property(Node)
  private registerPanel: Node = null!;
  
  @property(Button)
  private loginButton: Button = null!;
  
  @property(Button)
  private registerButton: Button = null!;
  
  @property(Button)
  private switchToRegisterButton: Button = null!;
  
  @property(Button)
  private switchToLoginButton: Button = null!;
  
  @property(Label)
  private statusLabel: Label = null!;
  
  @property(Sprite)
  private loadingIndicator: Sprite = null!;
  
  private isLoading: boolean = false;
  
  onLoad() {
    this.initUI();
    this.setupEventListeners();
    
    // 检查是否已登录
    this.checkLoginStatus();
  }
  
  private initUI(): void {
    // 默认显示登录面板
    this.showLoginPanel();
    
    // 隐藏加载指示器
    this.loadingIndicator.node.active = false;
    
    // 清空状态信息
    this.statusLabel.string = '';
  }
  
  private setupEventListeners(): void {
    // 登录按钮点击事件
    this.loginButton.node.on('click', this.onLoginClick, this);
    
    // 注册按钮点击事件
    this.registerButton.node.on('click', this.onRegisterClick, this);
    
    // 切换到注册面板
    this.switchToRegisterButton.node.on('click', () => {
      this.showRegisterPanel();
    });
    
    // 切换到登录面板
    this.switchToLoginButton.node.on('click', () => {
      this.showLoginPanel();
    });
  }
  
  private checkLoginStatus(): void {
    if (apiClient.isLoggedIn()) {
      const user = apiClient.getCurrentUser();
      this.showStatus(`已登录: ${user?.username}`, new Color(0, 255, 0));
      // 可以自动跳转到主页面
      // this.scheduleOnce(() => this.gotoMainScene(), 1);
    }
  }
  
  private showLoginPanel(): void {
    this.loginPanel.active = true;
    this.registerPanel.active = false;
    this.statusLabel.string = '';
  }
  
  private showRegisterPanel(): void {
    this.loginPanel.active = false;
    this.registerPanel.active = true;
    this.statusLabel.string = '';
  }
  
  private async onLoginClick(): Promise<void> {
    if (this.isLoading) return;
    
    const username = this.usernameInput.string.trim();
    const password = this.passwordInput.string.trim();
    
    // 输入验证
    if (!username || !password) {
      this.showStatus('请输入用户名和密码', new Color(255, 0, 0));
      return;
    }
    
    this.setLoading(true);
    
    try {
      const loginData: LoginRequest = { username, password };
      const result = await apiClient.login(loginData);
      
      if (result.success && result.data) {
        this.showStatus('登录成功！', new Color(0, 255, 0));
        
        // 延迟跳转到主页面
        this.scheduleOnce(() => {
          this.gotoMainScene();
        }, 1);
      } else {
        this.showStatus(`登录失败: ${result.error || '未知错误'}`, new Color(255, 0, 0));
      }
    } catch (error: any) {
      this.showStatus(`登录错误: ${error.message}`, new Color(255, 0, 0));
    } finally {
      this.setLoading(false);
    }
  }
  
  private async onRegisterClick(): Promise<void> {
    if (this.isLoading) return;
    
    const username = this.usernameInput.string.trim();
    const password = this.passwordInput.string.trim();
    const email = this.emailInput.string.trim();
    
    // 输入验证
    if (!username || !password || !email) {
      this.showStatus('请填写所有必填项', new Color(255, 0, 0));
      return;
    }
    
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showStatus('请输入有效的邮箱地址', new Color(255, 0, 0));
      return;
    }
    
    this.setLoading(true);
    
    try {
      const registerData: RegisterRequest = { username, email, password };
      const result = await apiClient.register(registerData);
      
      if (result.success && result.data) {
        this.showStatus('注册成功！已自动登录', new Color(0, 255, 0));
        
        // 延迟跳转到主页面
        this.scheduleOnce(() => {
          this.gotoMainScene();
        }, 1);
      } else {
        this.showStatus(`注册失败: ${result.error || '未知错误'}`, new Color(255, 0, 0));
      }
    } catch (error: any) {
      this.showStatus(`注册错误: ${error.message}`, new Color(255, 0, 0));
    } finally {
      this.setLoading(false);
    }
  }
  
  private gotoMainScene(): void {
    // 这里应该跳转到主场景
    // director.loadScene('Main');
    console.log('跳转到主页面');
    
    // 临时显示消息
    this.showStatus('准备跳转到主页面...', new Color(0, 200, 255));
  }
  
  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.loadingIndicator.node.active = loading;
    
    // 禁用/启用按钮
    this.loginButton.interactable = !loading;
    this.registerButton.interactable = !loading;
    this.switchToRegisterButton.interactable = !loading;
    this.switchToLoginButton.interactable = !loading;
    
    if (loading) {
      this.showStatus('处理中...', new Color(255, 255, 0));
    }
  }
  
  private showStatus(message: string, color?: Color): void {
    this.statusLabel.string = message;
    if (color) {
      this.statusLabel.color = color;
    }
    
    // 3秒后清空状态信息（除非是成功消息）
    if (!message.includes('成功') && !message.includes('跳转')) {
      this.scheduleOnce(() => {
        if (this.statusLabel.string === message) {
          this.statusLabel.string = '';
        }
      }, 3);
    }
  }
  
  // 测试API连接
  public async testApiConnection(): Promise<void> {
    this.setLoading(true);
    
    try {
      const result = await apiClient.checkHealth();
      
      if (result.success) {
        this.showStatus(`API连接正常: ${result.data?.status}`, new Color(0, 255, 0));
      } else {
        this.showStatus(`API连接失败: ${result.error}`, new Color(255, 0, 0));
      }
    } catch (error: any) {
      this.showStatus(`API测试错误: ${error.message}`, new Color(255, 0, 0));
    } finally {
      this.setLoading(false);
    }
  }
  
  // 登出
  public logout(): void {
    apiClient.logout();
    this.showStatus('已登出', new Color(255, 165, 0));
    this.showLoginPanel();
    
    // 清空输入框
    this.usernameInput.string = '';
    this.passwordInput.string = '';
    this.emailInput.string = '';
  }
}