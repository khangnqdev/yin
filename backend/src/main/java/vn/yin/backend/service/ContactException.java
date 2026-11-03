package vn.yin.backend.service;

public class ContactException extends RuntimeException {
    public enum Code { INVALID_PHONE, INVALID_STATUS, INVALID_TEXT, RATE_LIMIT, NOT_FOUND }

    private final Code code;

    public ContactException(Code code) {
        super(code.name());
        this.code = code;
    }

    public Code code() { return code; }
}
