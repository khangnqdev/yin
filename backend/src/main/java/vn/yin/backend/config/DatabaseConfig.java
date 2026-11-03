package vn.yin.backend.config;

import java.sql.DriverManager;
import java.sql.SQLException;
import javax.sql.DataSource;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseConfig {
    @Bean
    DataSource dataSource(
            @Value("${app.db.host}") String host,
            @Value("${app.db.port}") int port,
            @Value("${app.db.name}") String name,
            @Value("${app.db.username}") String username,
            @Value("${app.db.password}") String password,
            @Value("${app.db.encrypt}") boolean encrypt,
            @Value("${app.db.trust-server-certificate}") boolean trustServerCertificate,
            @Value("${spring.datasource.hikari.maximum-pool-size}") int maximumPoolSize) throws SQLException {
        if (!name.matches("[A-Za-z][A-Za-z0-9_]{0,127}")) {
            throw new IllegalArgumentException("Invalid database name");
        }
        if (host.isBlank() || host.indexOf(';') >= 0 || port < 1 || port > 65535 || maximumPoolSize < 1) {
            throw new IllegalArgumentException("Invalid database connection settings");
        }
        String base = "jdbc:sqlserver://" + host + ":" + port + ";encrypt=" + encrypt
                + ";trustServerCertificate=" + trustServerCertificate + ";databaseName=";
        try (var connection = DriverManager.getConnection(base + "master", username, password);
             var statement = connection.createStatement()) {
            statement.execute("IF DB_ID(N'" + name + "') IS NULL CREATE DATABASE [" + name + "]");
        }
        var source = new HikariDataSource();
        source.setJdbcUrl(base + name);
        source.setUsername(username);
        source.setPassword(password);
        source.setMaximumPoolSize(maximumPoolSize);
        return source;
    }
}

