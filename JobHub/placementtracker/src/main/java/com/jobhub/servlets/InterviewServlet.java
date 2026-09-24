package com.jobhub.servlets;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Map;
import java.util.Properties;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobhub.util.DBConnection;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/company/schedule-interview")
public class InterviewServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();

    // We use Resend API directly, so no statically hardcoded passwords needed here

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");

        String jwt = DBConnection.getJwtFromHeader(req);
        if (jwt == null) {
            resp.setStatus(401);
            return;
        }

        try {
            Map<String, String> body = mapper.readValue(req.getReader(), Map.class);
            String candidateId = body.get("candidateId");
            String date = body.get("date");
            String time = body.get("time");
            String mode = body.getOrDefault("mode", "online");
            String meetLink = body.getOrDefault("meetLink", "");
            String venue = body.getOrDefault("venue", "");
            String level = body.getOrDefault("level", "single");
            String description = body.getOrDefault("description", "");
            String customMessage = body.getOrDefault("message", "");

            String candidateEmail = "";
            String candidateName = "";
            String companyName = "";
            String jobTitle = "";
            String studentProfileId = "";

            try (Connection conn = DBConnection.getConnection()) {
                DBConnection.setRLSContextWithJWT(conn, jwt);
                String sql = "SELECT p.email, s.name, s.profile_id, c.name as company_name, j.title as job_title " +
                        "FROM applications a " +
                        "JOIN students s ON a.student_id = s.id " +
                        "JOIN profiles p ON s.profile_id = p.id " +
                        "JOIN jobs j ON a.job_id = j.id " +
                        "JOIN companies c ON j.company_id = c.id " +
                        "WHERE a.id = ?";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setLong(1, Long.parseLong(candidateId));
                    ResultSet rs = stmt.executeQuery();
                    if (rs.next()) {
                        candidateEmail = rs.getString("email");
                        candidateName = rs.getString("name");
                        companyName = rs.getString("company_name");
                        jobTitle = rs.getString("job_title");
                        studentProfileId = rs.getString("profile_id");
                    }
                }

                if (candidateEmail.isEmpty()) {
                    resp.setStatus(404);
                    resp.getWriter().write("{\"error\":\"Candidate not found\"}");
                    return;
                }

                // Update application status to 'Interviewing'
                String updateSql = "UPDATE applications SET status = 'Interviewing' WHERE id = ?";
                try (PreparedStatement stmt = conn.prepareStatement(updateSql)) {
                    stmt.setLong(1, Long.parseLong(candidateId));
                    stmt.executeUpdate();
                }

                // Insert notification for the student
                String notifSql = "INSERT INTO notifications (profile_id, title, message, link) VALUES (?::uuid, ?, ?, ?)";
                try (PreparedStatement stmt = conn.prepareStatement(notifSql)) {
                    stmt.setString(1, studentProfileId);
                    stmt.setString(2, "Interview Scheduled 📧");
                    stmt.setString(3, "You have received an interview invitation from " + companyName +
                            " for the " + jobTitle + " position. Check your email for full details!");
                    stmt.setString(4, "/dashboard/applications");
                    stmt.executeUpdate();
                }

                conn.commit();
            }

            // Send the premium email
            String locationInfo = mode.equals("online") ? meetLink : venue;
            sendPremiumEmail(candidateEmail, candidateName, companyName, jobTitle,
                    date, time, mode, locationInfo, level, description, customMessage);

            resp.getWriter().write("{\"message\":\"Interview email sent successfully\"}");

        } catch (Exception e) {
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    private void sendPremiumEmail(String toAddress, String name, String companyName, String jobTitle,
            String date, String time, String mode, String location,
            String level, String description, String customMessage) throws Exception {

        String resendKey = getResendApiKey();
        if (resendKey == null) {
            throw new Exception("RESEND_API_KEY missing from .env");
        }

        String modeLabel = mode.equals("online") ? "🖥️ Online (Virtual)" : "🏢 In-Person (Offline)";
        String locationLabel = mode.equals("online") ? "Meeting Link" : "Venue";
        String locationValue = mode.equals("online")
                ? "<a href='" + location + "' style='color:#6C63FF;text-decoration:none;font-weight:600;'>" + location
                        + "</a>"
                : location;
        String levelLabel = level.equals("multilevel") ? "Multi-Level (Additional Phases)"
                : "Single Level (Interview Only)";

        String htmlContent = "<!DOCTYPE html>"
                + "<html><head><meta charset='UTF-8'></head>"
                + "<body style='margin:0;padding:0;background-color:#0a0a0f;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#0a0a0f;padding:40px 20px;'>"
                + "<tr><td align='center'>"
                + "<table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(135deg,#12121a 0%,#1a1a2e 100%);border-radius:16px;border:1px solid rgba(108,99,255,0.2);box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden;'>"

                // Header with gradient
                + "<tr><td style='background:linear-gradient(135deg,#6C63FF 0%,#4ECDC4 100%);padding:32px 40px;text-align:center;'>"
                + "<h1 style='margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;'>Interview Invitation</h1>"
                + "<p style='margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;'>You've been selected for the next stage!</p>"
                + "</td></tr>"

                // Greeting
                + "<tr><td style='padding:32px 40px 16px;'>"
                + "<h2 style='margin:0;color:#e0e0e0;font-size:20px;font-weight:600;'>Hello " + name + ",</h2>"
                + "<p style='margin:12px 0 0;color:#9ca3af;font-size:15px;line-height:1.6;'>"
                + (customMessage.isEmpty()
                        ? "Congratulations! Your profile has been shortlisted and we'd like to invite you for an interview."
                        : customMessage)
                + "</p></td></tr>"

                // Job Info Card
                + "<tr><td style='padding:8px 40px 24px;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.15);border-radius:12px;'>"
                + "<tr><td style='padding:20px 24px;'>"
                + "<p style='margin:0 0 4px;color:#6C63FF;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;'>Position</p>"
                + "<p style='margin:0;color:#ffffff;font-size:18px;font-weight:700;'>" + jobTitle + "</p>"
                + "<p style='margin:6px 0 0;color:#9ca3af;font-size:14px;'>at " + companyName + "</p>"
                + "</td></tr></table>"
                + "</td></tr>"

                // Interview Details Grid
                + "<tr><td style='padding:0 40px 24px;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0'>"

                // Date & Time Row
                + "<tr>"
                + "<td width='50%' style='padding:0 8px 12px 0;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;'>"
                + "<tr><td style='padding:16px;'>"
                + "<p style='margin:0 0 4px;color:#6C63FF;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;'>📅 Date</p>"
                + "<p style='margin:0;color:#ffffff;font-size:16px;font-weight:600;'>" + date + "</p>"
                + "</td></tr></table></td>"
                + "<td width='50%' style='padding:0 0 12px 8px;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;'>"
                + "<tr><td style='padding:16px;'>"
                + "<p style='margin:0 0 4px;color:#6C63FF;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;'>🕐 Time</p>"
                + "<p style='margin:0;color:#ffffff;font-size:16px;font-weight:600;'>" + time + "</p>"
                + "</td></tr></table></td>"
                + "</tr>"

                // Mode & Level Row
                + "<tr>"
                + "<td width='50%' style='padding:0 8px 12px 0;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;'>"
                + "<tr><td style='padding:16px;'>"
                + "<p style='margin:0 0 4px;color:#6C63FF;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;'>Mode</p>"
                + "<p style='margin:0;color:#ffffff;font-size:14px;font-weight:600;'>" + modeLabel + "</p>"
                + "</td></tr></table></td>"
                + "<td width='50%' style='padding:0 0 12px 8px;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;'>"
                + "<tr><td style='padding:16px;'>"
                + "<p style='margin:0 0 4px;color:#6C63FF;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;'>Level</p>"
                + "<p style='margin:0;color:#ffffff;font-size:14px;font-weight:600;'>" + levelLabel + "</p>"
                + "</td></tr></table></td>"
                + "</tr>"
                + "</table></td></tr>"

                // Location/Link
                + "<tr><td style='padding:0 40px 24px;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background:rgba(78,205,196,0.08);border:1px solid rgba(78,205,196,0.15);border-radius:10px;'>"
                + "<tr><td style='padding:16px 20px;'>"
                + "<p style='margin:0 0 6px;color:#4ECDC4;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;'>"
                + locationLabel + "</p>"
                + "<p style='margin:0;color:#ffffff;font-size:15px;font-weight:500;'>" + locationValue + "</p>"
                + "</td></tr></table>"
                + "</td></tr>"

                // Job Description (if provided)
                + (description.isEmpty() ? ""
                        : "<tr><td style='padding:0 40px 24px;'>"
                                + "<table width='100%' cellpadding='0' cellspacing='0' style='background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;'>"
                                + "<tr><td style='padding:20px;'>"
                                + "<p style='margin:0 0 8px;color:#6C63FF;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;'>Job Details</p>"
                                + "<p style='margin:0;color:#d1d5db;font-size:14px;line-height:1.7;'>"
                                + description.replace("\n", "<br>") + "</p>"
                                + "</td></tr></table>"
                                + "</td></tr>")

                // Footer
                + "<tr><td style='padding:24px 40px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;'>"
                + "<p style='margin:0 0 4px;color:#6b7280;font-size:13px;'>Best of luck! 🍀</p>"
                + "<p style='margin:0;color:#4b5563;font-size:12px;'>Sent via <span style='color:#6C63FF;font-weight:600;'>JobHub</span></p>"
                + "</td></tr>"

                + "</table></td></tr></table></body></html>";

        Map<String, Object> payload = java.util.Map.of(
            "from", "JobHub <interview@mail.job-hub.work.gd>",
            "to", new String[]{toAddress},
            "subject", "🎯 Interview Invitation — " + jobTitle + " at " + companyName,
            "html", htmlContent
        );

        String jsonBody = mapper.writeValueAsString(payload);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + resendKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> resp = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new Exception("Resend API failed (" + resp.statusCode() + "): " + resp.body());
        }
    }

    private String getResendApiKey() {
        String key = System.getenv("RESEND_API_KEY");
        if (key != null && !key.isEmpty()) return key;

        String[] paths = { ".env", "../.env", "../../.env", "../job_hub-main/.env" };
        for (String path : paths) {
            try {
                java.util.List<String> lines = java.nio.file.Files.readAllLines(java.nio.file.Paths.get(path));
                for (String line : lines) {
                    if (line.trim().startsWith("RESEND_API_KEY=")) {
                        return line.substring(line.indexOf("=") + 1).trim();
                    }
                }
            } catch (Exception e) {
                // Ignore
            }
        }
        return null;
    }
}
