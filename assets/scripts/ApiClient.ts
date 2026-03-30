import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 用户类型
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// 宠物类型
export interface Pet {
  id: string;
  name: string;
  type: string;
  level: number;
  experience: number;
  hunger: number;
  mood: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// 作业类型
export interface Homework {
  id: string;
  subject: string;
  content: string;
  score: number;
  submittedAt: string;
  petId: string;
  userId: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 注册请求
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 宠物创建请求
export interface CreatePetRequest {
  name: string;
  type: string;
}

// 作业提交请求
export interface SubmitHomeworkRequest {
  subject: string;
  content: string;
  petId: string;
}

/**
 * API客户端类
 * 基于Cipher已验证的6个后端API实现
 */
export class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;
  private token: string | null = null;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加Token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 统一错误处理
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API请求错误:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * 设置认证Token
   */
  public setToken(token: string): void {
    this.token = token;
    // 可以存储到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('buddy_auth_token', token);
    }
  }

  /**
   * 获取当前Token
   */
  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('buddy_auth_token');
    }
    return this.token;
  }

  /**
   * 清除认证信息
   */
  public clearAuth(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('buddy_auth_token');
      localStorage.removeItem('buddy_user_info');
    }
  }

  // ==================== 已验证的API方法 ====================

  /**
   * 1. 服务状态检查
   * GET /
   */
  public async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get('/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 2. 用户注册
   * POST /api/v1/auth/register
   */
  public async register(data: RegisterRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.post('/api/v1/auth/register', data);
      
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 3. 用户登录
   * POST /api/v1/auth/login
   */
  public async login(data: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.post('/api/v1/auth/login', data);
      
      if (response.data.token) {
        this.setToken(response.data.token);
        // 存储用户信息
        if (typeof window !== 'undefined') {
          localStorage.setItem('buddy_user_info', JSON.stringify(response.data.user));
        }
      }
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 4. 创建宠物
   * POST /api/v1/pets
   */
  public async createPet(data: CreatePetRequest): Promise<ApiResponse<Pet>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.post('/api/v1/pets', data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 5. 获取宠物信息
   * GET /api/v1/pets/:petId
   */
  public async getPet(petId: string): Promise<ApiResponse<Pet>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(`/api/v1/pets/${petId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 6. 提交作业
   * POST /api/v1/homeworks/submit
   */
  public async submitHomework(data: SubmitHomeworkRequest): Promise<ApiResponse<Homework>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.post('/api/v1/homeworks/submit', data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 检查是否已登录
   */
  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * 获取当前用户信息
   */
  public getCurrentUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('buddy_user_info');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (error) {
          console.error('解析用户信息失败:', error);
        }
      }
    }
    return null;
  }

  /**
   * 登出
   */
  public logout(): void {
    this.clearAuth();
  }
}

// 导出单例实例
export const apiClient = ApiClient.getInstance();