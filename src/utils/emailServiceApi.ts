"use client";

import axios from "axios";
import type { AxiosInstance } from "axios";

const API_BASE_URL = "http://localhost:8000/api";

class EmailServiceApi {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        accept: "application/json"
      }
    });
  }

  async authenticate(username: string, password: string) {
    const response = await this.api.post("/authenticate", { username, password });
    return response.data;
  }

  async verifyToken() {
    const response = await this.api.get("/authenticate");
    return response.data;
  }

  async checkEmailConfig() {
    const response = await this.api.get("/check-email-config");
    return response.data;
  }

  async testConnection(data: {
    server: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    const response = await this.api.post("/test-connection", data);
    return response.data;
  }

  async saveEmailConfig(data: {
    start_time: string;
    end_time: string;
    interval: number;
    interval_unit: string;
    db_request_timeout: number;
    db_connection_timeout: number;
    username: string;
    password: string;
  }) {
    const response = await this.api.post("/save-email-config", data);
    return response.data;
  }

  async saveDatabaseConfig(data: {
    server: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    const response = await this.api.post("/save-config", data);
    return response.data;
  }

  async getCurrentConfig() {
    const response = await this.api.get("/get-current-config");
    return response.data;
  }

  async getDashboard() {
    const response = await this.api.get("/dashboard");
    return response.data;
  }

  async serviceControl(action: "start" | "stop", user: string) {
    const response = await this.api.post("/service-control", { action, user });
    return response.data;
  }

  async getCertificateStatus() {
    const response = await this.api.get("/certificate-status");
    return response.data;
  }

  async getCertificates() {
    const response = await this.api.get("/certificates");
    return response.data;
  }

  async getCertificatePinStatus(refresh: boolean = false) {
    const response = await this.api.get("/certificates/pins/status", {
      params: { refresh }
    });
    return response.data;
  }

  async storeCertificatePin(entries: Array<{
    token_label: string;
    certificate_id: string;
    slot_id: number;
    pin: string;
    certificate_subject: string;
    certificate_serial: string;
  }>) {
    const response = await this.api.post("/certificates/pins", { entries });
    return response.data;
  }
}

export default new EmailServiceApi();
