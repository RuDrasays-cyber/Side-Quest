package com.jobhub.servlets;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Array;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobhub.util.DBConnection;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/candidates/*")
public class CandidateServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();

    private String getJwtFromHeader(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        return (authHeader != null && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : null;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String jwt = getJwtFromHeader(req);
        if (jwt == null) { resp.setStatus(401); return; }

        List<Map<String, Object>> candidates = new ArrayList<>();
        try (Connection conn = DBConnection.getConnection()) {
            DBConnection.setRLSContextWithJWT(conn, jwt);

            String sql = "SELECT a.id as app_id, a.job_id, j.title as job_title, " +
                         "s.name, p.email, u.university_name, s.resume_url, " +
                         "s.cgpa, s.skills, s.is_on_campus, " +
                         "a.applied_at, a.status " +
                         "FROM applications a " +
                         "JOIN jobs j ON a.job_id = j.id " +
                         "JOIN students s ON a.student_id = s.id " +
                         "JOIN profiles p ON s.profile_id = p.id " +
                         "LEFT JOIN universities u ON s.university_id = u.id";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                ResultSet rs = stmt.executeQuery();
                while (rs.next()) {
                    Map<String, Object> candidate = new HashMap<>();
                    candidate.put("id", rs.getString("app_id")); 
                    candidate.put("jobId", rs.getString("job_id"));
                    candidate.put("jobTitle", rs.getString("job_title"));
                    candidate.put("name", rs.getString("name"));
                    candidate.put("email", rs.getString("email"));
                    candidate.put("university", rs.getString("university_name"));
                    candidate.put("resumeUrl", rs.getString("resume_url"));
                    candidate.put("appliedAt", rs.getString("applied_at"));
                    candidate.put("status", rs.getString("status").toLowerCase());
                    candidate.put("isOnCampus", rs.getObject("is_on_campus"));
                    
                    // CGPA
                    double cgpa = rs.getDouble("cgpa");
                    candidate.put("cgpa", rs.wasNull() ? null : cgpa);
                    
                    // Skills (TEXT[] → String[])
                    Array skillsArr = rs.getArray("skills");
                    if (skillsArr != null) {
                        String[] skillsArray = (String[]) skillsArr.getArray();
                        candidate.put("skills", skillsArray);
                    } else {
                        candidate.put("skills", new String[0]);
                    }
                    
                    candidates.add(candidate);
                }
            }
            conn.commit();
            mapper.writeValue(resp.getWriter(), candidates);
        } catch (Exception e) {
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    protected void doPatch(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String jwt = getJwtFromHeader(req);
        if (jwt == null) { resp.setStatus(401); return; }

        try {
            String pathInfo = req.getPathInfo();
            String[] parts = pathInfo.split("/");
            if (parts.length < 3) {
                resp.setStatus(400);
                resp.getWriter().write("{\"error\":\"Invalid path\"}");
                return;
            }
            long applicationId = Long.parseLong(parts[1]);
            String action = parts[2];

            try (Connection conn = DBConnection.getConnection()) {
                DBConnection.setRLSContextWithJWT(conn, jwt);

                if ("accept".equals(action)) {
                    // Update status to Accepted, mark student is_placed = true, send notification
                    String updateAppSq = "UPDATE applications SET status = 'Accepted' WHERE id = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(updateAppSq)) {
                        stmt.setLong(1, applicationId);
                        stmt.executeUpdate();
                    }

                    String selectSql = "SELECT s.id as student_id, s.profile_id, j.title, c.name as company_name " +
                                       "FROM applications a " +
                                       "JOIN students s ON a.student_id = s.id " +
                                       "JOIN jobs j ON a.job_id = j.id " +
                                       "JOIN companies c ON j.company_id = c.id " +
                                       "WHERE a.id = ?";
                    String studentProfileId = null;
                    long studentId = 0;
                    String jobTitle = "";
                    String companyName = "";
                    try (PreparedStatement stmt = conn.prepareStatement(selectSql)) {
                        stmt.setLong(1, applicationId);
                        ResultSet rs = stmt.executeQuery();
                        if (rs.next()) {
                            studentId = rs.getLong("student_id");
                            studentProfileId = rs.getString("profile_id");
                            jobTitle = rs.getString("title");
                            companyName = rs.getString("company_name");
                        }
                    }

                    if (studentId > 0) {
                        String updateStudentSql = "UPDATE students SET is_placed = true WHERE id = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(updateStudentSql)) {
                            stmt.setLong(1, studentId);
                            stmt.executeUpdate();
                        }
                        
                        String notifSql = "INSERT INTO notifications (profile_id, title, message, link) VALUES (?::uuid, ?, ?, ?)";
                        try (PreparedStatement stmt = conn.prepareStatement(notifSql)) {
                            stmt.setString(1, studentProfileId);
                            stmt.setString(2, "You're Hired! 🎉");
                            stmt.setString(3, "Congratulations! You have been selected for the " + jobTitle + " position at " + companyName + ".");
                            stmt.setString(4, "/dashboard/applications");
                            stmt.executeUpdate();
                        }
                    }
                    conn.commit();
                    resp.getWriter().write("{\"message\":\"Candidate accepted successfully\"}");

                } else if ("reject".equals(action)) {
                    String updateAppSq = "UPDATE applications SET status = 'Rejected' WHERE id = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(updateAppSq)) {
                        stmt.setLong(1, applicationId);
                        stmt.executeUpdate();
                    }

                    String selectSql = "SELECT s.profile_id, j.title, c.name as company_name " +
                                       "FROM applications a " +
                                       "JOIN students s ON a.student_id = s.id " +
                                       "JOIN jobs j ON a.job_id = j.id " +
                                       "JOIN companies c ON j.company_id = c.id " +
                                       "WHERE a.id = ?";
                    String studentProfileId = null;
                    String jobTitle = "";
                    String companyName = "";
                    try (PreparedStatement stmt = conn.prepareStatement(selectSql)) {
                        stmt.setLong(1, applicationId);
                        ResultSet rs = stmt.executeQuery();
                        if (rs.next()) {
                            studentProfileId = rs.getString("profile_id");
                            jobTitle = rs.getString("title");
                            companyName = rs.getString("company_name");
                        }
                    }

                    if (studentProfileId != null) {
                        String notifSql = "INSERT INTO notifications (profile_id, title, message, link) VALUES (?::uuid, ?, ?, ?)";
                        try (PreparedStatement stmt = conn.prepareStatement(notifSql)) {
                            stmt.setString(1, studentProfileId);
                            stmt.setString(2, "Application Update");
                            stmt.setString(3, "The company " + companyName + " has decided to move forward with other candidates for the " + jobTitle + " role.");
                            stmt.setString(4, "/dashboard/applications");
                            stmt.executeUpdate();
                        }
                    }
                    conn.commit();
                    resp.getWriter().write("{\"message\":\"Candidate rejected successfully\"}");

                } else if ("status".equals(action)) {
                    Map<String, String> body = mapper.readValue(req.getReader(), Map.class);
                    String newStatus = body.get("status");
                    String formattedStatus = newStatus.substring(0, 1).toUpperCase() + newStatus.substring(1).toLowerCase();

                    String sql = "UPDATE applications SET status = ? WHERE id = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setString(1, formattedStatus); 
                        stmt.setLong(2, applicationId);
                        stmt.executeUpdate();
                    }
                    conn.commit();
                    resp.getWriter().write("{\"message\":\"Status updated successfully\"}");
                } else {
                    resp.setStatus(400);
                    resp.getWriter().write("{\"error\":\"Invalid action\"}");
                }
            }
        } catch (Exception e) {
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        if ("PATCH".equalsIgnoreCase(req.getMethod())) {
            doPatch(req, resp);
        } else {
            super.service(req, resp);
        }
    }
}
