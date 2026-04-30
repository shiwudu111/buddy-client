import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type {
  ApiResponse,
  PetDashboardPayload,
  PetEvolutionPayload,
  PetFeedPayload,
  PetFeedResultPayload,
  PetResourcesPayload,
  PetStatus,
} from "../types/api";

class PetService {
  async refreshDashboard(
    canCommit?: () => boolean
  ): Promise<ApiResponse<PetStatus>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    const dashboardResult = await apiClient.getPetDashboard(petId);
    if (dashboardResult.success && dashboardResult.data && (!canCommit || canCommit())) {
      this.applyDashboardPayload(dashboardResult.data);
      return {
        success: true,
        data: dashboardResult.data.pet,
        statusCode: dashboardResult.statusCode,
      };
    }

    const statusResult = await apiClient.getPetStatus(petId);
    if (statusResult.success && statusResult.data && (!canCommit || canCommit())) {
      appState.setPetId(statusResult.data.pet_id);
      appState.setCurrentPet(statusResult.data);
      if (!appState.getPetFoodInventory().length) {
        appState.setPetFoodInventory([]);
      }
      return statusResult;
    }

    if (statusResult.statusCode === 404 && (!canCommit || canCommit())) {
      appState.clearPetState();
    }

    return statusResult.success
      ? statusResult
      : {
          success: false,
          message: dashboardResult.message ?? statusResult.message,
          statusCode: dashboardResult.statusCode ?? statusResult.statusCode,
        };
  }

  async refreshCurrentPet(canCommit?: () => boolean): Promise<ApiResponse<PetStatus>> {
    return this.refreshDashboard(canCommit);
  }

  async getCurrentPetEvolution(): Promise<ApiResponse<PetEvolutionPayload>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    return apiClient.getPetEvolution(petId);
  }

  async createPet(name = "Buddy"): Promise<ApiResponse<PetStatus>> {
    return apiClient.createPet(name);
  }

  async feedCurrentPet(
    payload?: PetFeedPayload
  ): Promise<ApiResponse<PetFeedResultPayload | PetResourcesPayload>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "请先创建宠物",
      };
    }

    if (payload) {
      const feedResult = await apiClient.feedPet(petId, payload);
      if (feedResult.success && feedResult.data) {
        appState.setCurrentPet(feedResult.data.pet);
        appState.setPetFoodInventory(feedResult.data.foods ?? []);
        return feedResult;
      }

      const fallbackResult = await apiClient.updatePetResources(petId, {
        fullness_delta: 15,
        mood_delta: 5,
        growth_delta: 0,
        reason: "manual_feed",
      });

      if (fallbackResult.success && fallbackResult.data) {
        const currentPet = appState.getCurrentPet();
        if (currentPet) {
          appState.setCurrentPet({
            ...currentPet,
            hunger: fallbackResult.data.hunger,
            mood: fallbackResult.data.mood,
            experience: fallbackResult.data.experience,
            status: fallbackResult.data.status,
          });
        }
      }

      return fallbackResult;
    }

    const updateResult = await apiClient.updatePetResources(petId, {
      fullness_delta: 15,
      mood_delta: 5,
      growth_delta: 0,
      reason: "manual_feed",
    });

    if (!updateResult.success) {
      return updateResult;
    }

    const currentPet = appState.getCurrentPet();
    if (currentPet && updateResult.data) {
      appState.setCurrentPet({
        ...currentPet,
        hunger: updateResult.data.hunger,
        mood: updateResult.data.mood,
        experience: updateResult.data.experience,
        status: updateResult.data.status,
      });
    }

    return updateResult;
  }

  private applyDashboardPayload(payload: PetDashboardPayload): void {
    appState.setPetId(payload.pet.pet_id);
    appState.setCurrentPet(payload.pet);
    appState.setPetFoodInventory(payload.foods ?? []);
    if (payload.recent_events?.length) {
      appState.setMainEvents(payload.recent_events);
    }
  }
}

export const petService = new PetService();
