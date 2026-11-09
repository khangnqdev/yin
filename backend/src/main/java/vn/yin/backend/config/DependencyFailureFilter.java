package vn.yin.backend.config;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.web.filter.OncePerRequestFilter;

public class DependencyFailureFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(request, response);
        } catch (DataAccessException error) {
            if (!(error instanceof DataAccessResourceFailureException || error instanceof QueryTimeoutException
                    || error instanceof RedisSystemException)) throw error;
            if (response.isCommitted()) throw error;
            response.resetBuffer();
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":\"SERVICE_UNAVAILABLE\",\"message\":\"Chức năng đang bị lỗi hệ thống. Vui lòng thử lại sau.\"}");
        }
    }
}
