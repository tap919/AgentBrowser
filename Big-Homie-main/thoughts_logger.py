"""Thoughts logger — stub for LLM gateway compatibility."""


class ThoughtsLogger:
    """No-op thoughts logger."""

    def log_model_selection(self, task_type, model, provider, reason=""):
        pass

    def log_cost_analysis(self, model, cost, tokens_in, tokens_out, reasoning_tokens=0):
        pass

    def log_decision(self, category, decision, details=""):
        pass


thoughts_logger = ThoughtsLogger()
