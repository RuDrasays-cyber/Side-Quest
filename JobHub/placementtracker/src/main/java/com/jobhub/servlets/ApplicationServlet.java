package com.jobhub.servlets;

import java.io.IOException;
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

@WebServlet("/applications/*")
public class ApplicationServlet extends HttpServlet {
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

        List<Map<String, Object>> apps = new ArrayList<>();
        try (Connection conn = DBConnection.getConnection()) {
            DBConnection.setRLSContextWithJWT(conn, jwt); 

            String sql = "SELECT a.id, a.status, a.applied_at, j.title as job_title, c.name as company " +
                         "FROM applications a " +
                         "JOIN jobs j ON a.job_id = j.id " +
                         "JOIN companies c ON j.company_id = c.id";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                ResultSet rs = stmt.executeQuery();
                while (rs.next()) {
                    Map<String, Object> app = new HashMap<>();
                    app.put("id", rs.getString("id"));
                    app.put("jobTitle", rs.getString("job_title"));
                    app.put("company", rs.getString("company"));
                    app.put("status", rs.getString("status").toLowerCase());
                    app.put("appliedAt", rs.getString("applied_at"));
                    apps.add(app);
                }
            }
            conn.commit();
            mapper.writeValue(resp.getWriter(), apps);
        } catch (Exception e) {
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
