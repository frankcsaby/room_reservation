from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        """
        Import signals when Django starts up.
        This ensures that signal handlers are registered and active.
        """
        import api.signals
