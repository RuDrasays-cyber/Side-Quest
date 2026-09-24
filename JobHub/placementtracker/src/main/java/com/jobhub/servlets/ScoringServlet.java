package com.jobhub.servlets;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import com.jobhub.util.DBConnection;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/score/*")
public class ScoringServlet extends HttpServlet {
    // private final ObjectMapper mapper = new ObjectMapper(); // Unused

    private String getJwtFromHeader(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        return (authHeader != null && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : null;
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
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(400);
            return;
        }

        try {
            Long jobId = Long.parseLong(pathInfo.substring(1)); // e.g., /123

            try (Connection conn = DBConnection.getConnection()) {
                DBConnection.setRLSContextWithJWT(conn, jwt);

                // 1. Get the current student's resume URL
                String resumeUrl = null;
                Long studentId = null;
                String studentSql = "SELECT id, resume_url FROM students WHERE profile_id = (current_setting('request.jwt.claims')::json->>'sub')::uuid";
                try (PreparedStatement stmt = conn.prepareStatement(studentSql)) {
                    ResultSet rs = stmt.executeQuery();
                    if (rs.next()) {
                        studentId = rs.getLong("id");
                        resumeUrl = rs.getString("resume_url");
                    }
                }

                if (resumeUrl == null || resumeUrl.isEmpty()) {
                    resp.setStatus(400);
                    resp.getWriter().write("{\"error\": \"No resume uploaded\"}");
                    return;
                }

                // 2. Get the Job's required skills
                String[] requiredSkills = null;
                String jobSql = "SELECT required_skills FROM jobs WHERE id = ?";
                try (PreparedStatement stmt = conn.prepareStatement(jobSql)) {
                    stmt.setLong(1, jobId);
                    ResultSet rs = stmt.executeQuery();
                    if (rs.next()) {
                        Array sqlArray = rs.getArray("required_skills");
                        if (sqlArray != null) {
                            requiredSkills = (String[]) sqlArray.getArray();
                        }
                    }
                }

                if (requiredSkills == null || requiredSkills.length == 0) {
                    resp.setStatus(400);
                    resp.getWriter().write("{\"error\": \"Job has no required skills to score against.\"}");
                    return;
                }

                // 3. Extract text from PDF
                String pdfText = extractTextFromPdfUrl(resumeUrl);

                if (pdfText == null || pdfText.trim().isEmpty()) {
                    resp.setStatus(400);
                    resp.getWriter()
                            .write("{\"error\": \"Could not extract text from PDF. It may be an image format.\"}");
                    return;
                }

                // 4. Calculate Score with skill breakdown
                List<String> matched = new ArrayList<>();
                List<String> missing = new ArrayList<>();
                double score = calculateMatchScore(pdfText, requiredSkills, matched, missing);

                // 5. Save the Score to the Applications table
                String updateAppSql = "UPDATE applications SET match_score = ? WHERE student_id = ? AND job_id = ?";
                try (PreparedStatement stmt = conn.prepareStatement(updateAppSql)) {
                    stmt.setDouble(1, score);
                    stmt.setLong(2, studentId);
                    stmt.setLong(3, jobId);
                    stmt.executeUpdate();
                }

                conn.commit();

                // Build JSON response with skill breakdown
                StringBuilder matchedJson = new StringBuilder("[");
                for (int i = 0; i < matched.size(); i++) {
                    if (i > 0) matchedJson.append(",");
                    matchedJson.append("\"").append(matched.get(i).replace("\"", "\\\"")).append("\"");
                }
                matchedJson.append("]");

                StringBuilder missingJson = new StringBuilder("[");
                for (int i = 0; i < missing.size(); i++) {
                    if (i > 0) missingJson.append(",");
                    missingJson.append("\"").append(missing.get(i).replace("\"", "\\\"")).append("\"");
                }
                missingJson.append("]");

                resp.setStatus(200);
                resp.getWriter().write(String.format(
                    "{\"match_percentage\": %.2f, \"matched\": %s, \"missing\": %s}",
                    score, matchedJson.toString(), missingJson.toString()));
            }
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(500);
            resp.getWriter().write("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    private String extractTextFromPdfUrl(String pdfUrlString) throws IOException {
        URL url = java.net.URI.create(pdfUrlString).toURL();
        try (InputStream is = url.openStream();
                PDDocument document = org.apache.pdfbox.Loader
                        .loadPDF(new org.apache.pdfbox.io.RandomAccessReadBuffer(is))) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private double calculateMatchScore(String resumeText, String[] requiredSkills,
            List<String> matched, List<String> missing) {
        String normalizedResume = resumeText.toLowerCase().replaceAll("[^a-z0-9]", " ");
        Set<String> keywords = new HashSet<>(Arrays.asList(normalizedResume.split("\\s+")));

        for (String skill : requiredSkills) {
            String normalizedSkill = skill.toLowerCase().trim();
            if (keywords.contains(normalizedSkill) || normalizedResume.contains(normalizedSkill)) {
                matched.add(skill);
            } else {
                missing.add(skill);
            }
        }

        if (requiredSkills.length == 0) return 100.0;
        return (double) matched.size() / requiredSkills.length * 100.0;
    }
}
