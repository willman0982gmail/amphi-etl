# GDP Spark Gateway — JupyterLab PageConfig (example)
#
# Copy into your Jupyter config dir, or pass via --config:
#   jupyter lab --config=examples/jupyter_gdp_gateway_pageconfig.py
#
# Or merge into ~/.jupyter/jupyter_lab_config.py
#
# Local UI smoke (no live Gateway): keep UseFixture = True.
# Live Gateway: set UseFixture False and fill Url / AuthToken / ExternalHost.

c = get_config()  # noqa: F821

# --- Local fixture mode (Browse UI without live API) ---
c.LabApp.page_config_data = {
    "gdpSparkGatewayUseFixture": "true",
    "gdpSparkGatewayNamespace": "example-ns-gdp-spark-jobs-dev",
    "gdpSparkConnectExternalHost": "spark-connect-dedicated.example.com",
    # Optional Create New deep-link (disabled until set):
    # "gdpSparkGatewayPortalUrl": "https://portal.example.com",
    # "gdpSparkGatewayCreateUrlTemplate": "https://portal.example.com/connects/new?namespace={namespace}",
}

# --- Live Gateway example (uncomment and replace placeholders) ---
# c.LabApp.page_config_data = {
#     "gdpSparkGatewayUseFixture": "false",
#     "gdpSparkGatewayUrl": "https://<GATEWAY_HOST>",
#     "gdpSparkGatewayAuthToken": "<REDACTED_JWT>",
#     "gdpSparkConnectExternalHost": "<spark-connect-external-host>",
#     "gdpSparkGatewayNamespace": "<your-namespace>",
# }
