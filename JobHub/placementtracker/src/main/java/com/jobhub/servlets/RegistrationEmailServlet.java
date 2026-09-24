package com.jobhub.servlets;

import java.io.IOException;
import java.util.Map;
import java.util.Properties;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/auth/welcome")
public class RegistrationEmailServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String SENDER_EMAIL = "antigravplacement@gmail.com";
    private static final String SENDER_PW = "srmg ttdc uckf mqas"; // App password

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");

        try {
            Map<String, String> body = mapper.readValue(req.getReader(), Map.class);
            String primaryEmail = body.get("primaryEmail");
            String secondaryEmail = body.get("secondaryEmail");
            String name = body.get("name");

            if (secondaryEmail != null && !secondaryEmail.isEmpty()) {
                sendWelcomeEmail(secondaryEmail, primaryEmail, name);
            }
            
            resp.setStatus(200);
            resp.getWriter().write("{\"message\": \"Welcome email dispatched\"}");
        } catch (Exception e) {
            resp.setStatus(500);
            resp.getWriter().write("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    private void sendWelcomeEmail(String toEmail, String primaryEmail, String name) throws Exception {
        Properties props = new Properties();
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "587");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");

        Session session = Session.getInstance(props, new Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(SENDER_EMAIL, SENDER_PW);
            }
        });

        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress(SENDER_EMAIL, "JobHub"));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
        message.setSubject("Welcome to JobHub! Secure Backup Registered.");

        String htmlMsg = "<div style=\"font-family: Arial, sans-serif; color: #333;\">"
                + "<h2>Welcome to JobHub, " + name + "!</h2>"
                + "<p>An official JobHub account has been securely created and linked to your domain email address: <b>" + primaryEmail + "</b>.</p>"
                + "<p>We have safely recorded this personal email (" + toEmail + ") as your secure backup. If you ever lose access to your domain, you will be able to recover your platform access using this address.</p>"
                + "<br>"
                + "<p><b>Action Required:</b> Please check your domain email inbox (" + primaryEmail + ") to click the magic verification link so you can log in!</p>"
                + "<br><br>"
                + "<p>Best regards,<br>The JobHub Admin Team</p>"
                + "</div>";

        message.setContent(htmlMsg, "text/html; charset=utf-8");
        Transport.send(message);
    }
}
