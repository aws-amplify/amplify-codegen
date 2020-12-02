import setuptools


with open("README.md") as fp:
    long_description = fp.read()


setuptools.setup(
    name="ci_cd_pipeline",
    version="0.0.1",

    description="Amplify Codegen CI/CD pipeline infrastructure",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="author",

    package_dir={"": "ci_cd_pipeline"},
    packages=setuptools.find_packages(where="ci_cd_pipeline"),

    install_requires=[
        "aws-cdk.core==1.74.0",
        "boto3"
    ],

    python_requires=">=3.6",

    classifiers=[
        "Development Status :: 4 - Beta",

        "Intended Audience :: Developers",

        "License :: OSI Approved :: Apache Software License",

        "Programming Language :: JavaScript",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",

        "Topic :: Software Development :: Code Generators",
        "Topic :: Utilities",

        "Typing :: Typed",
    ],
)
