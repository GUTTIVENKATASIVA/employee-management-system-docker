"""Configuration read from environment variables (never hardcoded)."""
import os

from sqlalchemy.engine import URL


def build_database_uri() -> str:
    """Build the SQLAlchemy URI for MySQL.

    Inside Docker Compose the host is the service name `db`.
    `DATABASE_URL` can override everything (handy for local development).
    """
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit

    url = URL.create(
        drivername="mysql+pymysql",
        username=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        host=os.getenv("DB_HOST", "db"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("MYSQL_DATABASE", "employee_db"),
        query={"charset": "utf8mb4"},
    )
    # URL.create escapes special characters in the password for us.
    return url.render_as_string(hide_password=False)


class Config:
    SQLALCHEMY_DATABASE_URI = None  # filled in by create_app()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}
    MAX_CONTENT_LENGTH = 64 * 1024  # requests are tiny JSON documents
    JSON_SORT_KEYS = False
