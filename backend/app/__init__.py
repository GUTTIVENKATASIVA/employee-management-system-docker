import logging
import time

from flask import Flask, jsonify
from sqlalchemy.exc import OperationalError
from werkzeug.exceptions import HTTPException

from .config import Config, build_database_uri
from .extensions import db

_HTTP_MESSAGES = {
    400: "Bad request",
    404: "Resource not found",
    405: "Method not allowed",
    413: "Request body too large",
}


def _wait_for_database(app, attempts=30, delay=2):
    """Create tables, retrying while MySQL is still starting up."""
    for attempt in range(1, attempts + 1):
        try:
            with app.app_context():
                db.create_all()
            app.logger.info("Database ready")
            return
        except OperationalError as exc:
            # Log only the exception type: never echo connection details.
            app.logger.warning("Database not ready (attempt %d/%d): %s",
                               attempt, attempts, type(exc.orig).__name__ if exc.orig else "OperationalError")
            time.sleep(delay)
    raise RuntimeError("Could not connect to the database")


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    app.json.sort_keys = False

    if test_config is None:
        app.config["SQLALCHEMY_DATABASE_URI"] = build_database_uri()
    else:
        app.config.update(test_config)

    logging.basicConfig(level=logging.INFO)
    db.init_app(app)

    from .routes import api
    app.register_blueprint(api)

    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        message = _HTTP_MESSAGES.get(exc.code, exc.name)
        return jsonify(error=message), exc.code

    @app.errorhandler(OperationalError)
    def handle_db_unavailable(exc):
        db.session.rollback()
        app.logger.exception("Database error")
        return jsonify(error="Database temporarily unavailable"), 503

    @app.errorhandler(Exception)
    def handle_unexpected(exc):
        db.session.rollback()
        app.logger.exception("Unhandled error")  # full detail stays in the logs
        return jsonify(error="Internal server error"), 500

    if test_config is None:
        _wait_for_database(app)
    else:
        with app.app_context():
            db.create_all()

    return app
