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

@WebServlet("/university/*")
public class UniversityServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();

    private String getJwtFromHeader(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        return (authHeader != null && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : null;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String pathInfo = req.getPathInfo();
        String jwt = getJwtFromHeader(req);

        try (Connection conn = DBConnection.getConnection()) {
            if (jwt != null) { DBConnection.setRLSContextWithJWT(conn, jwt); }

            if ("/domains".equals(pathInfo)) {
                
                List<Map<String, Object>> domains = new ArrayList<>();
                String sql = "SELECT id, university_name, domain_name, is_verified FROM universities";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    ResultSet rs = stmt.executeQuery();
                    while (rs.next()) {
                        Map<String, Object> d = new HashMap<>();
                        d.put("id", rs.getString("id"));
                        d.put("universityName", rs.getString("university_name"));
                        d.put("domain", rs.getString("domain_name"));
                        d.put("verified", rs.getBoolean("is_verified"));
                        domains.add(d);
                    }
                }
                conn.commit();
                mapper.writeValue(resp.getWriter(), domains);
            } 
            else if ("/verifications".equals(pathInfo)) {
        
                mapper.writeValue(resp.getWriter(), new ArrayList<>()); 
            } 
            else if ("/analytics".equals(pathInfo)) {
                
                Map<String, Object> analytics = new HashMap<>();
                analytics.put("placementPercentage", 0);
                analytics.put("companyParticipation", new ArrayList<>());
                analytics.put("monthlyPlacements", new ArrayList<>());
                mapper.writeValue(resp.getWriter(), analytics);
            }
        } catch (Exception e) {
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
@Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String pathInfo = req.getPathInfo();
        String jwt = getJwtFromHeader(req);
        
        if (jwt == null) { resp.setStatus(401); return; }

        if ("/domains".equals(pathInfo)) {
            try {
                Map<String, String> body = mapper.readValue(req.getReader(), Map.class);
                String domain = body.get("domain");
                String uniName = body.get("universityName");

                try (Connection conn = DBConnection.getConnection()) {
                    DBConnection.setRLSContextWithJWT(conn, jwt);
                    
                    
                    String sql = "INSERT INTO universities (domain_name, university_name) VALUES (?, ?)";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setString(1, domain);
                        stmt.setString(2, uniName);
                        stmt.executeUpdate();
                    }
                    conn.commit();
                    resp.getWriter().write("{\"message\":\"Domain added successfully\"}");
                }
            } catch (Exception e) {
                resp.setStatus(500);
                resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
            }
        } else {
            resp.setStatus(404);
        }
    }
}
