package vn.yin.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SwaggerRedirectController {

    @GetMapping({"/swagger", "/swagger/", "/swagger-ui", "/swagger-ui/"})
    public String redirectToSwagger() {
        return "redirect:/swagger-ui/index.html";
    }
}

