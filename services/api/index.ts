// services/api/index.ts
import { citizenService } from './citizenService';
import { letterService } from './letterService';
import { complaintService } from './complaintService';
import { announcementService } from './announcementService';
import { apbdesService } from './apbdesService';
import { villageService } from './villageService';

export {
  citizenService,
  letterService,
  complaintService,
  announcementService,
  apbdesService,
  villageService
};

/**
 * Unified API Client for Dekati Mobile.
 * Maintains 100% backward compatibility with existing screen imports while delegating
 * domain logic to specialized services.
 */
export const api = {
  // 1. Citizen & Auth Services
  loginCitizen: citizenService.loginCitizen.bind(citizenService),
  registerCitizen: citizenService.registerCitizen.bind(citizenService),
  logoutCitizen: citizenService.logoutCitizen.bind(citizenService),
  getCurrentUser: citizenService.getCurrentUser.bind(citizenService),
  getFamilyMembers: citizenService.getFamilyMembers.bind(citizenService),
  addFamilyMember: citizenService.addFamilyMember.bind(citizenService),
  updateFamilyMemberDocument: citizenService.updateFamilyMemberDocument.bind(citizenService),
  uploadCitizenVerificationDocs: citizenService.uploadCitizenVerificationDocs.bind(citizenService),
  deleteFamilyMember: citizenService.deleteFamilyMember.bind(citizenService),
  updateCitizenProfile: citizenService.updateCitizenProfile.bind(citizenService),

  // 2. Letters (E-Surat Pelayanan)
  getLetterTypes: letterService.getLetterTypes.bind(letterService),
  getLetterRequests: letterService.getLetterRequests.bind(letterService),
  getLetterRequestByTracking: letterService.getLetterRequestByTracking.bind(letterService),
  submitLetterRequest: letterService.submitLetterRequest.bind(letterService),
  formatTimelineSteps: letterService.formatTimelineSteps.bind(letterService),

  // 3. Complaints (Aduan & Aspirasi)
  getMyComplaintTickets: complaintService.getMyComplaintTickets.bind(complaintService),
  saveMyComplaintTicket: complaintService.saveMyComplaintTicket.bind(complaintService),
  getComplaints: complaintService.getComplaints.bind(complaintService),
  getComplaintById: complaintService.getComplaintById.bind(complaintService),
  getComplaintByTicket: complaintService.getComplaintByTicket.bind(complaintService),
  submitComplaint: complaintService.submitComplaint.bind(complaintService),

  // 4. Announcements
  getAnnouncements: announcementService.getAnnouncements.bind(announcementService),
  getAnnouncementById: announcementService.getAnnouncementById.bind(announcementService),

  // 5. APBDes
  getApbdes: apbdesService.getApbdes.bind(apbdesService),

  // 6. Emergency Contacts, Events & Village Profile
  getEmergencyContacts: villageService.getEmergencyContacts.bind(villageService),
  getVillageEvents: villageService.getVillageEvents.bind(villageService),
  getVillageProfile: villageService.getVillageProfile.bind(villageService),
};

export default api;
