/**
 * 学伴精灵 API 客户端
 * 基于后端18个API接口封装
 * 创建时间：2026-03-27 18:00
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  grade?: string;
  createdAt: string;
}

export interface Pet {
  id: string;
  name: string;
  level: number;
  experience: number;
  hunger: number;      // 饱食度 0-100
  mood: number;        // 心情值 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Homework {
  id: string;
  userId: string;
  subject: string;     // 科目：chinese, math, english
  content: string;     // 作业内容
  imageUrl?: string;   // 作业图片
  score?: number;      // 评分 0-100
  submittedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  petId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export interface ParentInfo {
  id: string;
  userId: string;
  parentId: string;
  relationship: string; // 关系：father, mother, guardian
  createdAt: string;
}

class ApiClient {
  private baseUrl: string = 'http://localhost:3000/api';
  private token: string | null = null;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    // 尝试从localStorage恢复token
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        this.token = savedToken;
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || `请求失败: ${response.status}`,
          code: response.status,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('API请求错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  // ==================== Auth 模块 ====================

  /**
   * 用户注册
   */
  async register(params: {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    grade?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 用户登录
   */
  async login(params: {
    username: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (result.success && result.data?.token) {
      this.token = result.data.token;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('auth_token', result.data.token);
      }
    }

    return result;
  }

  /**
   * 刷新Token
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/auth/me');
  }

  /**
   * 退出登录
   */
  logout(): void {
    this.token = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('auth_token');
    }
  }

  // ==================== Pets 模块 ====================

  /**
   * 创建宠物
   */
  async createPet(params: { name: string }): Promise<ApiResponse<Pet>> {
    return this.request('/pets', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 获取宠物状态
   */
  async getPetStatus(petId: string): Promise<ApiResponse<Pet>> {
    return this.request(`/pets/${petId}/status`);
  }

  /**
   * 喂食宠物
   */
  async feedPet(petId: string): Promise<ApiResponse<Pet>> {
    return this.request(`/pets/${petId}/feed`, {
      method: 'POST',
    });
  }

  /**
   * 与宠物玩耍
   */
  async playWithPet(petId: string): Promise<ApiResponse<Pet>> {
    return this.request(`/pets/${petId}/play`, {
      method: 'POST',
    });
  }

  /**
   * 获取宠物详情
   */
  async getPetDetails(petId: string): Promise<ApiResponse<Pet>> {
    return this.request(`/pets/${petId}`);
  }

  // ==================== Homework 模块 ====================

  /**
   * 提交作业
   */
  async submitHomework(params: {
    subject: string;
    content: string;
    imageUrl?: string;
  }): Promise<ApiResponse<Homework>> {
    return this.request('/homework/submit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 获取作业历史
   */
  async getHomeworkHistory(params?: {
    page?: number;
    limit?: number;
    subject?: string;
  }): Promise<ApiResponse<Homework[]>> {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request(`/homework/history${query}`);
  }

  /**
   * 获取今日作业
   */
  async getTodayHomework(): Promise<ApiResponse<Homework[]>> {
    return this.request('/homework/today');
  }

  // ==================== Chat 模块 ====================

  /**
   * 发送消息
   */
  async sendMessage(params: {
    petId: string;
    content: string;
  }): Promise<ApiResponse<ChatMessage>> {
    return this.request('/chat/send', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 获取聊天历史
   */
  async getChatHistory(params: {
    petId: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ChatMessage[]>> {
    const query = params.page || params.limit 
      ? `?${new URLSearchParams({ 
          page: params.page?.toString() || '1',
          limit: params.limit?.toString() || '20'
        }).toString()}`
      : '';
    return this.request(`/chat/history/${params.petId}${query}`);
  }

  // ==================== Parents 模块 ====================

  /**
   * 绑定家长
   */
  async bindParent(params: {
    parentId: string;
    relationship: string;
  }): Promise<ApiResponse<ParentInfo>> {
    return this.request('/parents/bind', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 解绑家长
   */
  async unbindParent(parentId: string): Promise<ApiResponse<void>> {
    return this.request(`/parents/unbind/${parentId}`, {
      method: 'POST',
    });
  }

  /**
   * 获取绑定的宠物
   */
  async getBoundPets(): Promise<ApiResponse<Pet[]>> {
    return this.request('/parents/pets');
  }

  /**
   * 获取孩子的作业记录
   */
  async getChildHomework(childId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Homework[]>> {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request(`/parents/homework/${childId}${query}`);
  }

  // ==================== 工具方法 ====================

  /**
   * 设置认证Token
   */
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * 获取当前Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.token;
  }
}

// 导出单例实例
export const apiClient = new ApiClient();

export default ApiClient;