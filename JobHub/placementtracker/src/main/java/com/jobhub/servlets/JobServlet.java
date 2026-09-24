package com.jobhub.servlets;

import java.io.IOException;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
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

@WebServlet("/jobs/*")
public class JobServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();

    private String getJwtFromHeader(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        return (authHeader != null && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : null;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String jwt = getJwtFromHeader(req);
        if (jwt == null) {
            resp.setStatus(401);
            return;
        }

        List<Map<String, Object>> jobs = new ArrayList<>();
        try (Connection conn = DBConnection.getConnection()) {
            DBConnection.setRLSContextWithJWT(conn, jwt);

            String myJobsParam = req.getParameter("my_jobs");
            String sql;
            if ("true".equals(myJobsParam)) {
                sql = "SELECT j.*, c.name as company_name FROM jobs j JOIN companies c ON j.company_id = c.id WHERE c.profile_id = CAST(current_setting('request.jwt.claim.sub', true) AS uuid) ORDER BY j.id DESC";
            } else {
                sql = "SELECT j.*, c.name as company_name FROM jobs j JOIN companies c ON j.company_id = c.id ORDER BY j.id DESC";
            }
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                ResultSet rs = stmt.executeQuery();
                while (rs.next()) {
                    Map<String, Object> job = new HashMap<>();
                    job.put("id", rs.getString("id"));
                    job.put("title", rs.getString("title"));
                    job.put("company", rs.getString("company_name"));
                    job.put("salary", rs.getString("salary"));
                    job.put("min_cgpa", rs.getDouble("min_cgpa"));
                    job.put("is_off_campus", rs.getBoolean("is_off_campus"));
                    job.put("description", rs.getString("description"));
                    job.put("location", rs.getString("location"));
                    job.put("type", rs.getString("type"));
                    job.put("department", rs.getString("department"));

                    // Convert SQL arrays to Java lists
                    Array tagsArr = rs.getArray("tags");
                    if (tagsArr != null) {
                        String[] tags = (String[]) tagsArr.getArray();
                        job.put("tags", tags);
                    }
                    Array skillsArr = rs.getArray("required_skills");
                    if (skillsArr != null) {
                        String[] rskills = (String[]) skillsArr.getArray();
                        job.put("required_skills", rskills);
                    }

                    jobs.add(job);
                }
            }
            conn.commit();
            mapper.writeValue(resp.getWriter(), jobs);
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String jwt = getJwtFromHeader(req);
        if (jwt == null) {
            resp.setStatus(401);
            return;
        }

        String pathInfo = req.getPathInfo();

        try (Connection conn = DBConnection.getConnection()) {
            DBConnection.setRLSContextWithJWT(conn, jwt);

            if (pathInfo != null && pathInfo.endsWith("/apply")) {

                String jobId = pathInfo.split("/")[1];

                String sql = "INSERT INTO applications (job_id, student_id, status) " +
                        "VALUES (?, (SELECT id FROM students WHERE profile_id = CAST(current_setting('request.jwt.claim.sub', true) AS uuid)), 'Applied')";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setLong(1, Long.parseLong(jobId));
                    stmt.executeUpdate();
                }
                conn.commit();
                resp.getWriter().write("{\"message\":\"Applied successfully\"}");

            } else {

                Map<String, Object> jobData = mapper.readValue(req.getReader(), Map.class);
                String sql = "INSERT INTO jobs (company_id, title, salary, is_off_campus, target_university_id, description, location, type, tags, department, required_skills, min_cgpa) " +
                        "VALUES ((SELECT id FROM companies WHERE profile_id = CAST(current_setting('request.jwt.claim.sub', true) AS uuid)), ?, CAST(? AS numeric), ?, ?, ?, ?, ?, ?, ?, ?, CAST(? as numeric))";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, (String) jobData.get("title"));
                    stmt.setString(2, jobData.getOrDefault("salary", "0").toString());
                    stmt.setBoolean(3, (Boolean) jobData.getOrDefault("is_off_campus", true));
                    
                    Object tUniId = jobData.get("target_university_id");
                    if (tUniId != null && !tUniId.toString().isEmpty()) {
                        stmt.setLong(4, Long.parseLong(tUniId.toString()));
                    } else {
                        stmt.setNull(4, java.sql.Types.BIGINT);
                    }
                    
                    stmt.setString(5, (String) jobData.get("description"));
                    stmt.setString(6, (String) jobData.get("location"));
                    stmt.setString(7, (String) jobData.get("type"));

                    // Convert tags list to SQL array
                    List<String> tagsList = (List<String>) jobData.get("tags");
                    if (tagsList != null) {
                        stmt.setArray(8, conn.createArrayOf("text", tagsList.toArray()));
                    } else {
                        stmt.setNull(8, java.sql.Types.ARRAY);
                    }

                    stmt.setString(9, (String) jobData.get("department"));

                    List<String> skillsList = (List<String>) jobData.get("required_skills");
                    if (skillsList != null) {
                        stmt.setArray(10, conn.createArrayOf("text", skillsList.toArray()));
                    } else {
                        stmt.setNull(10, java.sql.Types.ARRAY);
                    }

                    stmt.setString(11, jobData.getOrDefault("min_cgpa", "0").toString());

                    stmt.executeUpdate();
                }
                conn.commit();
                resp.getWriter().write("{\"message\":\"Job posted successfully\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String jwt = getJwtFromHeader(req);
        if (jwt == null) {
            resp.setStatus(401);
            return;
        }

        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.length() <= 1) {
            resp.setStatus(400);
            resp.getWriter().write("{\"error\":\"Job ID missing\"}");
            return;
        }

        String jobId = pathInfo.substring(1);

        try (Connection conn = DBConnection.getConnection()) {
            DBConnection.setRLSContextWithJWT(conn, jwt);

            String sql = "DELETE FROM jobs WHERE id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setLong(1, Long.parseLong(jobId));
                int rows = stmt.executeUpdate();
                if (rows > 0) {
                     resp.getWriter().write("{\"message\":\"Job deleted successfully\"}");
                } else {
                     resp.setStatus(404);
                     resp.getWriter().write("{\"error\":\"Job not found or unauthorized\"}");
                }
            }
            conn.commit();
        } catch (Exception e) {
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
