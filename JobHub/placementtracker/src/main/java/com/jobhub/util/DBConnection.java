package com.jobhub.util;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Base64;

import jakarta.servlet.http.HttpServletRequest;

public class DBConnection {
    private static final String DEFAULT_URL = "jdbc:postgresql://aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require";
    private static final String DEFAULT_USER = "postgres.wblmkitklldieehlirvb";
    private static final String DEFAULT_PASS = "tviIjPh4OWPO7DRY";

    private static String dbUrl;
    private static String dbUser;
    private static String dbPass;

    static {
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }

        // Load env variables
        dbUrl = System.getenv("DB_URL");
        dbUser = System.getenv("DB_USER");
        dbPass = System.getenv("DB_PASS");

        // If not in env, try to read .env file
        if (dbUrl == null || dbUrl.isEmpty()) {
            loadEnvFile();
        }

        // Final fallback to real Supabase values
        if (dbUrl == null || dbUrl.isEmpty())
            dbUrl = DEFAULT_URL;
        if (dbUser == null || dbUser.isEmpty())
            dbUser = DEFAULT_USER;
        if (dbPass == null || dbPass.isEmpty())
            dbPass = DEFAULT_PASS;
    }

    private static void loadEnvFile() {
        File envFile = new File(".env");
        if (!envFile.exists()) {
            // Try parent if we're in a subdirectory
            envFile = new File("../.env");
        }

        if (envFile.exists()) {
            try (BufferedReader bf = new BufferedReader(new FileReader(envFile))) {
                String line;
                while ((line = bf.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#"))
                        continue;
                    String[] parts = line.split("=", 2);
                    if (parts.length == 2) {
                        String key = parts[0].trim();
                        String val = parts[1].trim();
                        if ("DB_URL".equals(key))
                            dbUrl = val;
                        else if ("DB_USER".equals(key))
                            dbUser = val;
                        else if ("DB_PASS".equals(key))
                            dbPass = val;
                    }
                }
            } catch (Exception e) {
                System.err.println("[DBConnection] Could not read .env file: " + e.getMessage());
            }
        }
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl, dbUser, dbPass);
    }

    public static void setRLSContextWithJWT(Connection conn, String jwtToken) throws SQLException {
        if (jwtToken == null || jwtToken.isEmpty())
            return;

        conn.setAutoCommit(false);

        String claimsJson = "{}";
        String sub = "";
        try {
            String[] parts = jwtToken.split("\\.");
            if (parts.length >= 2) {
                // Ensure padding for Base64 decoding if missing
                String payload = parts[1];
                while (payload.length() % 4 != 0)
                    payload += "=";

                byte[] decoded = Base64.getUrlDecoder().decode(payload);
                claimsJson = new String(decoded, "UTF-8");

                // Simple manual JSON extraction for "sub"
                int subIdx = claimsJson.indexOf("\"sub\"");
                if (subIdx >= 0) {
                    int colonIdx = claimsJson.indexOf(':', subIdx);
                    int quoteStart = claimsJson.indexOf('"', colonIdx + 1);
                    int quoteEnd = claimsJson.indexOf('"', quoteStart + 1);
                    if (quoteStart >= 0 && quoteEnd > quoteStart) {
                        sub = claimsJson.substring(quoteStart + 1, quoteEnd);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[DBConnection] Failed to decode JWT: " + e.getMessage());
        }

        java.sql.Statement st = conn.createStatement();
        st.execute("SET LOCAL request.jwt.claims = '" + claimsJson.replace("'", "''") + "'");

        if (!sub.isEmpty()) {
            st.execute("SET LOCAL request.jwt.claim.sub = '" + sub.replace("'", "''") + "'");
        }

        st.execute("SET LOCAL role = 'authenticated'");
        st.close();
    }

    public static String getJwtFromHeader(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}